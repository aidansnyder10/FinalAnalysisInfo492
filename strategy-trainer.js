// Strategy Trainer - Self-learning system for attack optimization
// Learns from attack results and adapts strategy selection

const fs = require('fs');
const path = require('path');

const LEARNED_STRATEGIES_FILE = './learned-strategies.json';
const LEARNED_STRATEGIES_BACKUP = './learned-strategies.json.backup';

class StrategyTrainer {
    constructor(allStrategies, allPersonas, inboxFile = './bank-inbox.json') {
        this.allStrategies = allStrategies || [];
        this.allPersonas = allPersonas || [];
        this.inboxFile = inboxFile;
        
        // Strategy performance tracking
        // Key: "model|attackLevel|urgencyLevel", Value: { attempts, successes, bypassRate, clickRate, score }
        this.strategyScores = {};
        
        // Persona vulnerability tracking
        // Key: persona.id, Value: { attempts, successes, bypassRate, clickRate, vulnerabilityScore }
        this.personaVulnerabilities = {};
        
        // Strategy-Persona combination tracking
        // Key: "strategyKey|personaId", Value: { attempts, successes, bypassRate, clickRate }
        this.combinations = {};
        
        // Learning parameters
        this.successThreshold = 30; // Minimum bypass rate % to consider "successful"
        this.explorationRate = 0.2; // 20% chance to try random strategy instead of best
        this.minAttemptsForLearning = 3; // Minimum attempts before trusting a score
        this.learningDecay = 0.95; // Decay factor for old results (95% weight to recent)
        
        // Load learned patterns from file
        this.loadLearnedPatterns();
        
        // Initialize default scores for all strategies/personas
        this.initializeDefaultScores();
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [STRATEGY-TRAINER] [${level}] ${message}`;
        console.log(logMessage);
    }

    /**
     * Get unique key for a strategy
     */
    getStrategyKey(strategy) {
        return `${strategy.model}|${strategy.attackLevel}|${strategy.urgencyLevel}`;
    }

    /**
     * Get unique key for strategy-persona combination
     */
    getCombinationKey(strategy, personaId) {
        return `${this.getStrategyKey(strategy)}|${personaId}`;
    }

    /**
     * Load learned patterns from file
     */
    loadLearnedPatterns() {
        try {
            if (fs.existsSync(LEARNED_STRATEGIES_FILE)) {
                const data = fs.readFileSync(LEARNED_STRATEGIES_FILE, 'utf8');
                const learned = JSON.parse(data);
                
                this.strategyScores = learned.strategyScores || {};
                this.personaVulnerabilities = learned.personaVulnerabilities || {};
                this.combinations = learned.combinations || {};
                
                this.log(`Loaded learned patterns: ${Object.keys(this.strategyScores).length} strategies, ${Object.keys(this.personaVulnerabilities).length} personas`);
            }
        } catch (error) {
            this.log(`Failed to load learned patterns: ${error.message}`, 'WARN');
        }
    }

    /**
     * Save learned patterns to file (with backup)
     */
    saveLearnedPatterns() {
        try {
            // Backup existing file
            if (fs.existsSync(LEARNED_STRATEGIES_FILE)) {
                fs.copyFileSync(LEARNED_STRATEGIES_FILE, LEARNED_STRATEGIES_BACKUP);
            }
            
            const data = {
                lastUpdated: new Date().toISOString(),
                strategyScores: this.strategyScores,
                personaVulnerabilities: this.personaVulnerabilities,
                combinations: this.combinations,
                learningParams: {
                    successThreshold: this.successThreshold,
                    explorationRate: this.explorationRate,
                    minAttemptsForLearning: this.minAttemptsForLearning
                }
            };
            
            fs.writeFileSync(LEARNED_STRATEGIES_FILE, JSON.stringify(data, null, 2));
            this.log(`Saved learned patterns to ${LEARNED_STRATEGIES_FILE}`);
        } catch (error) {
            this.log(`Failed to save learned patterns: ${error.message}`, 'ERROR');
        }
    }

    /**
     * Initialize default scores for all strategies and personas
     */
    initializeDefaultScores() {
        // Initialize strategy scores
        this.allStrategies.forEach(strategy => {
            const key = this.getStrategyKey(strategy);
            if (!this.strategyScores[key]) {
                // Default scores based on attack level
                let defaultBypass = 20;
                if (strategy.attackLevel === 'expert') defaultBypass = 40;
                else if (strategy.attackLevel === 'advanced') defaultBypass = 30;
                else if (strategy.attackLevel === 'basic') defaultBypass = 20;
                
                this.strategyScores[key] = {
                    attempts: 0,
                    successes: 0,
                    bypassRate: defaultBypass,
                    clickRate: 0,
                    score: defaultBypass, // Initial score
                    lastUpdated: new Date().toISOString()
                };
            }
        });

        // Initialize persona vulnerabilities
        this.allPersonas.forEach(persona => {
            // Normalize ID to string for consistent key storage
            const personaIdStr = String(persona.id);
            if (!this.personaVulnerabilities[personaIdStr]) {
                // Default vulnerability based on access level
                let defaultVulnerability = 30;
                if (persona.accessLevel === 'Critical') defaultVulnerability = 50;
                else if (persona.accessLevel === 'High') defaultVulnerability = 40;
                else if (persona.accessLevel === 'Medium') defaultVulnerability = 30;
                else if (persona.accessLevel === 'Low') defaultVulnerability = 20;

                this.personaVulnerabilities[personaIdStr] = {
                    attempts: 0,
                    successes: 0,
                    bypassRate: defaultVulnerability,
                    clickRate: 0,
                    vulnerabilityScore: defaultVulnerability,
                    lastUpdated: new Date().toISOString()
                };
            }
        });
    }

    /**
     * Calculate success score from results
     */
    calculateSuccessScore(results) {
        // Weight bypass rate (70%) and click rate (30%)
        const bypassWeight = 0.7;
        const clickWeight = 0.3;
        
        const bypassScore = (results.bypassRate || 0) / 100;
        const clickScore = (results.clickRate || 0) / 100;
        
        return (bypassScore * bypassWeight + clickScore * clickWeight) * 100;
    }

    /**
     * Get actual status of emails from inbox file
     * @param {Array} emailIds - Array of email IDs to check
     * @returns {Object} Map of emailId -> { bypassed: boolean, clicked: boolean }
     */
    getEmailStatuses(emailIds) {
        const statuses = {};
        
        try {
            if (fs.existsSync(this.inboxFile)) {
                const data = fs.readFileSync(this.inboxFile, 'utf8');
                const emails = JSON.parse(data);
                
                // Create a map of email IDs to their status
                const emailMap = {};
                emails.forEach(email => {
                    emailMap[email.id] = email;
                });
                
                // Check each email ID
                emailIds.forEach(emailId => {
                    const email = emailMap[emailId];
                    if (email) {
                        // Email bypassed if status is 'delivered' or undefined/null
                        const bypassed = email.status === 'delivered' || 
                                       email.status === undefined || 
                                       email.status === null ||
                                       (email.status !== 'blocked' && email.status !== 'reported');
                        
                        // Check if email was clicked (look for clicked events)
                        // We'll check this from the events array if available, or use a simple heuristic
                        const clicked = email.clicked === true || 
                                      (email.events && email.events.some(e => e.event === 'clicked' && !e.phantom));
                        
                        statuses[emailId] = { bypassed, clicked };
                    } else {
                        // Email not found yet, assume it hasn't been processed
                        statuses[emailId] = { bypassed: false, clicked: false };
                    }
                });
            }
        } catch (error) {
            this.log(`Failed to read inbox file for learning: ${error.message}`, 'WARN');
        }
        
        return statuses;
    }

    /**
     * Learn from a completed attack cycle
     * @param {Object} cycleResult - Results from executeAttackCycle
     * @param {Array} emailsGenerated - Array of generated email objects with IDs
     * @param {Object} industryMetrics - Metrics from industry system (bypass/detected/clicked)
     */
    learnFromCycle(cycleResult, emailsGenerated, industryMetrics) {
        if (!emailsGenerated || emailsGenerated.length === 0) {
            return;
        }

        // Get actual status of each email from the inbox file
        const emailIds = emailsGenerated.map(e => e.id);
        const emailStatuses = this.getEmailStatuses(emailIds);

        // Learn from each email result using ACTUAL status
        emailsGenerated.forEach(email => {
            const strategy = {
                model: email.model,
                attackLevel: email.attackLevel,
                urgencyLevel: email.urgencyLevel
            };
            const strategyKey = this.getStrategyKey(strategy);
            // Normalize persona ID to string for consistent key storage
            const personaId = email.targetPersona?.id != null ? String(email.targetPersona.id) : null;
            const combinationKey = personaId ? this.getCombinationKey(strategy, personaId) : null;

            // Get ACTUAL email result from inbox file
            const emailStatus = emailStatuses[email.id] || { bypassed: false, clicked: false };
            const emailBypassed = emailStatus.bypassed;
            const emailClicked = emailStatus.clicked;

            // Update strategy scores
            if (!this.strategyScores[strategyKey]) {
                this.strategyScores[strategyKey] = {
                    attempts: 0,
                    successes: 0,
                    bypassRate: 0,
                    clickRate: 0,
                    score: 0,
                    lastUpdated: new Date().toISOString()
                };
            }

            const strategyData = this.strategyScores[strategyKey];
            strategyData.attempts += 1;
            
            // Apply learning decay to old data
            if (strategyData.attempts > this.minAttemptsForLearning) {
                const oldWeight = this.learningDecay;
                const newWeight = 1 - this.learningDecay;
                
                strategyData.bypassRate = (strategyData.bypassRate * oldWeight) + 
                    (emailBypassed ? 100 * newWeight : 0 * newWeight);
                strategyData.clickRate = (strategyData.clickRate * oldWeight) + 
                    (emailClicked ? 100 * newWeight : 0 * newWeight);
            } else {
                // Simple moving average for first few attempts
                const currentBypass = (strategyData.bypassRate * (strategyData.attempts - 1) + 
                    (emailBypassed ? 100 : 0)) / strategyData.attempts;
                const currentClick = (strategyData.clickRate * (strategyData.attempts - 1) + 
                    (emailClicked ? 100 : 0)) / strategyData.attempts;
                
                strategyData.bypassRate = currentBypass;
                strategyData.clickRate = currentClick;
            }

            if (emailBypassed) {
                strategyData.successes += 1;
            }

            strategyData.score = this.calculateSuccessScore({
                bypassRate: strategyData.bypassRate,
                clickRate: strategyData.clickRate
            });
            strategyData.lastUpdated = new Date().toISOString();

            // Update persona vulnerabilities
            if (personaId) {
                if (!this.personaVulnerabilities[personaId]) {
                    this.personaVulnerabilities[personaId] = {
                        attempts: 0,
                        successes: 0,
                        bypassRate: 0,
                        clickRate: 0,
                        vulnerabilityScore: 0,
                        lastUpdated: new Date().toISOString()
                    };
                }

                const personaData = this.personaVulnerabilities[personaId];
                personaData.attempts += 1;

                if (personaData.attempts > this.minAttemptsForLearning) {
                    const oldWeight = this.learningDecay;
                    const newWeight = 1 - this.learningDecay;
                    
                    personaData.bypassRate = (personaData.bypassRate * oldWeight) + 
                        (emailBypassed ? 100 * newWeight : 0 * newWeight);
                    personaData.clickRate = (personaData.clickRate * oldWeight) + 
                        (emailClicked ? 100 * newWeight : 0 * newWeight);
                } else {
                    const currentBypass = (personaData.bypassRate * (personaData.attempts - 1) + 
                        (emailBypassed ? 100 : 0)) / personaData.attempts;
                    const currentClick = (personaData.clickRate * (personaData.attempts - 1) + 
                        (emailClicked ? 100 : 0)) / personaData.attempts;
                    
                    personaData.bypassRate = currentBypass;
                    personaData.clickRate = currentClick;
                }

                if (emailBypassed) {
                    personaData.successes += 1;
                }

                personaData.vulnerabilityScore = this.calculateSuccessScore({
                    bypassRate: personaData.bypassRate,
                    clickRate: personaData.clickRate
                });
                personaData.lastUpdated = new Date().toISOString();
            }

            // Update combination scores
            if (combinationKey) {
                if (!this.combinations[combinationKey]) {
                    this.combinations[combinationKey] = {
                        attempts: 0,
                        successes: 0,
                        bypassRate: 0,
                        clickRate: 0,
                        lastUpdated: new Date().toISOString()
                    };
                }

                const comboData = this.combinations[combinationKey];
                comboData.attempts += 1;

                if (comboData.attempts > this.minAttemptsForLearning) {
                    const oldWeight = this.learningDecay;
                    const newWeight = 1 - this.learningDecay;
                    
                    comboData.bypassRate = (comboData.bypassRate * oldWeight) + 
                        (emailBypassed ? 100 * newWeight : 0 * newWeight);
                    comboData.clickRate = (comboData.clickRate * oldWeight) + 
                        (emailClicked ? 100 * newWeight : 0 * newWeight);
                } else {
                    const currentBypass = (comboData.bypassRate * (comboData.attempts - 1) + 
                        (emailBypassed ? 100 : 0)) / comboData.attempts;
                    const currentClick = (comboData.clickRate * (comboData.attempts - 1) + 
                        (emailClicked ? 100 : 0)) / comboData.attempts;
                    
                    comboData.bypassRate = currentBypass;
                    comboData.clickRate = currentClick;
                }

                if (emailBypassed) {
                    comboData.successes += 1;
                }
                comboData.lastUpdated = new Date().toISOString();
            }
        });

        // Save learned patterns
        this.saveLearnedPatterns();
        
        // Calculate summary stats for logging
        const bypassedCount = Object.values(emailStatuses).filter(s => s.bypassed).length;
        const clickedCount = Object.values(emailStatuses).filter(s => s.clicked).length;
        const overallBypassRate = emailsGenerated.length > 0 ? (bypassedCount / emailsGenerated.length) * 100 : 0;
        const overallClickRate = bypassedCount > 0 ? (clickedCount / bypassedCount) * 100 : 0;
        
        this.log(`Learned from cycle: ${emailsGenerated.length} emails, ${bypassedCount} bypassed (${overallBypassRate.toFixed(2)}%), ${clickedCount} clicked (${overallClickRate.toFixed(2)}% of bypassed)`);
    }

    /**
     * Select the best strategy based on learned patterns
     * Uses exploration vs exploitation trade-off
     */
    selectBestStrategy() {
        // Exploration: sometimes try random strategy
        if (Math.random() < this.explorationRate) {
            const randomStrategy = this.allStrategies[
                Math.floor(Math.random() * this.allStrategies.length)
            ];
            this.log(`Exploration: selected random strategy ${this.getStrategyKey(randomStrategy)}`);
            return randomStrategy;
        }

        // Exploitation: select best strategy based on scores
        let bestStrategy = null;
        let bestScore = -1;

        this.allStrategies.forEach(strategy => {
            const key = this.getStrategyKey(strategy);
            const strategyData = this.strategyScores[key];
            
            if (strategyData) {
                // Weight score by number of attempts (more attempts = more reliable)
                const confidence = Math.min(strategyData.attempts / this.minAttemptsForLearning, 1);
                const adjustedScore = strategyData.score * confidence;
                
                if (adjustedScore > bestScore) {
                    bestScore = adjustedScore;
                    bestStrategy = strategy;
                }
            } else {
                // If no data, use default score
                if (bestScore < 0) {
                    bestStrategy = strategy;
                    bestScore = 20; // Default score
                }
            }
        });

        if (bestStrategy) {
            const key = this.getStrategyKey(bestStrategy);
            const data = this.strategyScores[key];
            this.log(`Exploitation: selected best strategy ${key} (score: ${data?.score.toFixed(2) || 'N/A'}, attempts: ${data?.attempts || 0})`);
        }

        return bestStrategy || this.allStrategies[0];
    }

    /**
     * Select best targets (personas) based on learned vulnerabilities
     * @param {number} count - Number of targets to select
     */
    selectBestTargets(count = 3) {
        // Calculate selection scores for each persona
        // Combines vulnerability score with exploration bonus
        const personaScores = this.allPersonas.map(persona => {
            // Normalize ID to string for consistent key lookup
            const personaIdStr = String(persona.id);
            const personaData = this.personaVulnerabilities[personaIdStr];
            const attempts = personaData?.attempts || 0;
            const vulnerabilityScore = personaData?.vulnerabilityScore || 0;
            
            // Exploration bonus: prioritize under-explored personas
            // If a persona has fewer than minAttemptsForLearning attempts, give it bonus
            const explorationBonus = attempts < this.minAttemptsForLearning 
                ? (this.minAttemptsForLearning - attempts) * 20 // Big bonus for unexplored
                : attempts < (this.minAttemptsForLearning * 2)
                ? (this.minAttemptsForLearning * 2 - attempts) * 10 // Medium bonus for under-explored
                : 0; // No bonus for well-explored
            
            // Confidence weight: weight vulnerability score by confidence (number of attempts)
            // But cap it so we don't ignore under-explored personas completely
            const confidence = Math.min(attempts / this.minAttemptsForLearning, 1.5);
            const adjustedVulnerabilityScore = vulnerabilityScore * Math.min(confidence, 1.0);
            
            // Final score = adjusted vulnerability + exploration bonus
            const finalScore = adjustedVulnerabilityScore + explorationBonus;
            
            return {
                persona,
                finalScore,
                vulnerabilityScore,
                attempts,
                explorationBonus
            };
        });

        // Sort by final score (descending)
        personaScores.sort((a, b) => b.finalScore - a.finalScore);

        // Select top N personas
        const selected = personaScores.slice(0, count).map(item => item.persona);

        // Log selection reason for debugging (occasionally)
        if (Math.random() < 0.1) { // 10% chance to log
            this.log(`Target selection: ${selected.map(p => {
                const personaIdStr = String(p.id);
                const data = this.personaVulnerabilities[personaIdStr];
                return `${p.name} (vuln: ${data?.vulnerabilityScore?.toFixed(1) || 0}, attempts: ${data?.attempts || 0})`;
            }).join(', ')}`);
        }

        return selected;
    }

    /**
     * Get the best strategy for a specific persona based on combination scores
     */
    getBestStrategyForPersona(personaId) {
        // Normalize ID to string for consistent key lookup
        const personaIdStr = String(personaId);
        let bestStrategy = null;
        let bestScore = -1;

        this.allStrategies.forEach(strategy => {
            const comboKey = this.getCombinationKey(strategy, personaIdStr);
            const comboData = this.combinations[comboKey];
            
            if (comboData && comboData.attempts >= this.minAttemptsForLearning) {
                const score = this.calculateSuccessScore({
                    bypassRate: comboData.bypassRate,
                    clickRate: comboData.clickRate
                });
                
                if (score > bestScore) {
                    bestScore = score;
                    bestStrategy = strategy;
                }
            }
        });

        // If no combination data, use general best strategy
        return bestStrategy || this.selectBestStrategy();
    }

    /**
     * Get statistics about learned patterns
     */
    getStats() {
        const strategies = Object.keys(this.strategyScores).map(key => {
            const data = this.strategyScores[key];
            return {
                strategy: key,
                ...data
            };
        }).sort((a, b) => b.score - a.score);

        const personas = Object.keys(this.personaVulnerabilities).map(id => {
            const data = this.personaVulnerabilities[id];
            // Handle both string and number IDs (JS object keys are strings)
            const persona = this.allPersonas.find(p => String(p.id) === String(id));
            return {
                personaId: id,
                personaName: persona?.name || `Persona ${id}`,
                ...data
            };
        }).sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);

        return {
            topStrategies: strategies.slice(0, 5),
            topVulnerablePersonas: personas.slice(0, 5),
            totalStrategies: strategies.length,
            totalPersonas: personas.length,
            totalCombinations: Object.keys(this.combinations).length
        };
    }
}

module.exports = StrategyTrainer;

