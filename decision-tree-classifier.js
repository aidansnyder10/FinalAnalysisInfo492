/**
 * Decision Tree Classifier for Email Phishing Risk Assessment
 * 
 * This module implements a decision tree algorithm to classify emails into:
 * - High Risk: Likely phishing attempts requiring immediate action
 * - Medium Risk: Suspicious emails requiring review
 * - Low Risk: Likely legitimate emails
 * 
 * Features analyzed:
 * - URL authenticity and suspicious patterns
 * - Keywords in subject and content
 * - Sender authenticity
 * - Urgency indicators
 * - Grammar and spelling quality
 * - Social engineering tactics
 * - Email structure and professionalism
 */

class DecisionTreeClassifier {
    constructor() {
        // Initialize feature extractors
        this.urlAnalyzer = new URLAnalyzer();
        this.keywordAnalyzer = new KeywordAnalyzer();
        this.senderAnalyzer = new SenderAnalyzer();
        this.grammarAnalyzer = new GrammarAnalyzer();
        
        // Decision tree structure (can be trained or manually defined)
        this.tree = this.buildDecisionTree();
    }

    /**
     * Main classification method
     * @param {Object} email - Email object with subject, content, sender, senderEmail, urls, etc.
     * @returns {Object} Classification result with riskLevel, riskScore, and reasoning
     */
    classify(email) {
        // Extract features from email
        const features = this.extractFeatures(email);
        
        // Traverse decision tree
        const result = this.traverseTree(features, this.tree);
        
        return {
            riskLevel: result.riskLevel,
            riskScore: result.riskScore,
            confidence: result.confidence,
            reasoning: result.reasoning,
            features: features
        };
    }

    /**
     * Extract all relevant features from email
     */
    extractFeatures(email) {
        const subject = (email.subject || '').toLowerCase();
        const content = (email.content || '').toLowerCase();
        const sender = (email.sender || '').toLowerCase();
        const senderEmail = (email.senderEmail || '').toLowerCase();
        const urls = email.urls || this.urlAnalyzer.extractUrls(content) || [];
        
        return {
            // URL features
            hasUrls: urls.length > 0,
            urlCount: urls.length,
            urlAuthenticityScore: this.urlAnalyzer.analyzeAuthenticity(urls, senderEmail, content),
            hasSuspiciousUrls: this.urlAnalyzer.hasSuspiciousPatterns(urls),
            hasUrlShorteners: this.urlAnalyzer.hasUrlShorteners(urls),
            hasIpAddresses: this.urlAnalyzer.hasIpAddresses(urls),
            hasHttpLinks: this.urlAnalyzer.hasHttpLinks(urls),
            urlDomainMismatch: this.urlAnalyzer.checkDomainMismatch(urls, senderEmail),
            
            // Keyword features
            urgencyKeywords: this.keywordAnalyzer.countUrgencyKeywords(subject, content),
            credentialKeywords: this.keywordAnalyzer.countCredentialKeywords(subject, content),
            financialKeywords: this.keywordAnalyzer.countFinancialKeywords(subject, content),
            securityKeywords: this.keywordAnalyzer.countSecurityKeywords(subject, content),
            threatKeywords: this.keywordAnalyzer.countThreatKeywords(subject, content),
            callToActionKeywords: this.keywordAnalyzer.countCallToActionKeywords(content),
            suspiciousPhrases: this.keywordAnalyzer.countSuspiciousPhrases(content),
            
            // Sender features
            senderAuthenticityScore: this.senderAnalyzer.analyzeAuthenticity(senderEmail, sender),
            hasSuspiciousSenderPattern: this.senderAnalyzer.hasSuspiciousPattern(senderEmail),
            senderDomainReputation: this.senderAnalyzer.analyzeDomainReputation(senderEmail),
            
            // Content quality features
            grammarScore: this.grammarAnalyzer.analyzeGrammar(content),
            spellingScore: this.grammarAnalyzer.analyzeSpelling(content),
            professionalismScore: this.grammarAnalyzer.analyzeProfessionalism(content),
            hasProfessionalGreeting: this.grammarAnalyzer.hasProfessionalGreeting(content),
            hasProfessionalClosing: this.grammarAnalyzer.hasProfessionalClosing(content),
            
            // Social engineering features
            authorityImpersonation: this.keywordAnalyzer.hasAuthorityImpersonation(content),
            scarcityTactics: this.keywordAnalyzer.hasScarcityTactics(content),
            consistencyTactics: this.keywordAnalyzer.hasConsistencyTactics(content),
            
            // Structural features
            subjectLength: subject.length,
            contentLength: content.length,
            hasExcessivePunctuation: this.grammarAnalyzer.hasExcessivePunctuation(subject),
            subjectAllCaps: subject === subject.toUpperCase() && subject.length > 10,
            hasAttachments: email.attachments && email.attachments.length > 0,
            
            // Combined scores
            totalUrgencyScore: 0,
            totalSuspicionScore: 0
        };
        
        // Calculate combined scores
        features.totalUrgencyScore = 
            features.urgencyKeywords * 3 +
            (features.hasExcessivePunctuation ? 5 : 0) +
            (features.subjectAllCaps ? 8 : 0);
            
        features.totalSuspicionScore = 
            features.credentialKeywords * 4 +
            features.securityKeywords * 3 +
            features.threatKeywords * 3 +
            features.callToActionKeywords * 2 +
            (features.urlAuthenticityScore < 50 ? 10 : 0) +
            (features.senderAuthenticityScore < 50 ? 8 : 0);
        
        return features;
    }

    /**
     * Build decision tree structure
     * This is a rule-based tree that can be replaced with a trained model
     */
    buildDecisionTree() {
        return {
            // Root node: Check URL authenticity (most important feature)
            condition: (features) => {
                if (features.hasUrls) {
                    return features.urlAuthenticityScore < 30;
                }
                return null; // No URLs, check next condition
            },
            trueBranch: {
                // High risk: Suspicious URLs
                riskLevel: 'high',
                riskScore: 85,
                confidence: 0.9,
                reasoning: 'Suspicious or unauthentic URLs detected in email'
            },
            falseBranch: {
                // Continue to next check
                condition: (features) => {
                    // Check for credential requests with urgency
                    return features.credentialKeywords >= 2 && features.urgencyKeywords >= 2;
                },
                trueBranch: {
                    riskLevel: 'high',
                    riskScore: 80,
                    confidence: 0.85,
                    reasoning: 'Credential requests combined with urgency indicators'
                },
                falseBranch: {
                    condition: (features) => {
                        // Check URL domain mismatch
                        return features.urlDomainMismatch;
                    },
                    trueBranch: {
                        riskLevel: 'high',
                        riskScore: 75,
                        confidence: 0.8,
                        reasoning: 'URL domain does not match sender domain'
                    },
                    falseBranch: {
                        condition: (features) => {
                            // Check for multiple high-risk indicators
                            return features.totalSuspicionScore >= 20;
                        },
                        trueBranch: {
                            riskLevel: 'high',
                            riskScore: 70,
                            confidence: 0.75,
                            reasoning: 'Multiple suspicious indicators detected'
                        },
                        falseBranch: {
                            condition: (features) => {
                                // Medium risk: Suspicious sender with some risk indicators
                                return features.senderAuthenticityScore < 40 && 
                                       (features.credentialKeywords >= 1 || features.securityKeywords >= 1);
                            },
                            trueBranch: {
                                riskLevel: 'medium',
                                riskScore: 55,
                                confidence: 0.7,
                                reasoning: 'Suspicious sender with risk indicators'
                            },
                            falseBranch: {
                                condition: (features) => {
                                    // Medium risk: Urgency without clear legitimacy
                                    return features.totalUrgencyScore >= 15 && 
                                           features.professionalismScore < 60;
                                },
                                trueBranch: {
                                    riskLevel: 'medium',
                                    riskScore: 50,
                                    confidence: 0.65,
                                    reasoning: 'High urgency with low professionalism indicators'
                                },
                                falseBranch: {
                                    condition: (features) => {
                                        // Medium risk: Suspicious URLs but not clearly malicious
                                        return features.hasSuspiciousUrls && 
                                               features.urlAuthenticityScore >= 30 && 
                                               features.urlAuthenticityScore < 60;
                                    },
                                    trueBranch: {
                                        riskLevel: 'medium',
                                        riskScore: 45,
                                        confidence: 0.6,
                                        reasoning: 'Some suspicious URL patterns detected'
                                    },
                                    falseBranch: {
                                        condition: (features) => {
                                            // Medium risk: Poor grammar with risk keywords
                                            return features.grammarScore < 50 && 
                                                   (features.credentialKeywords >= 1 || 
                                                    features.financialKeywords >= 1);
                                        },
                                        trueBranch: {
                                            riskLevel: 'medium',
                                            riskScore: 40,
                                            confidence: 0.55,
                                            reasoning: 'Poor grammar combined with risk keywords'
                                        },
                                        falseBranch: {
                                            // Low risk: Professional email with good indicators
                                            condition: (features) => {
                                                return features.professionalismScore >= 70 && 
                                                       features.grammarScore >= 60 && 
                                                       features.senderAuthenticityScore >= 60;
                                            },
                                            trueBranch: {
                                                riskLevel: 'low',
                                                riskScore: 25,
                                                confidence: 0.8,
                                                reasoning: 'Professional email with good authenticity indicators'
                                            },
                                            falseBranch: {
                                                // Default: Low risk if no major red flags
                                                riskLevel: 'low',
                                                riskScore: 30,
                                                confidence: 0.6,
                                                reasoning: 'No major risk indicators detected'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
    }

    /**
     * Traverse decision tree with features
     */
    traverseTree(features, node) {
        if (node.riskLevel) {
            // Leaf node - return classification
            return node;
        }
        
        if (node.condition) {
            const conditionResult = node.condition(features);
            
            if (conditionResult === true && node.trueBranch) {
                return this.traverseTree(features, node.trueBranch);
            } else if (conditionResult === false && node.falseBranch) {
                return this.traverseTree(features, node.falseBranch);
            } else if (node.falseBranch) {
                // Condition returned null, continue with false branch
                return this.traverseTree(features, node.falseBranch);
            }
        }
        
        // Fallback
        return {
            riskLevel: 'low',
            riskScore: 30,
            confidence: 0.5,
            reasoning: 'Unable to classify - defaulting to low risk'
        };
    }
}

/**
 * URL Analyzer - Analyzes URL authenticity and suspicious patterns
 */
class URLAnalyzer {
    extractUrls(text) {
        if (!text) return [];
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
        return text.match(urlRegex) || [];
    }

    analyzeAuthenticity(urls, senderEmail, content) {
        if (urls.length === 0) return 100; // No URLs = no URL risk
        
        let authenticityScore = 100;
        
        for (const url of urls) {
            // Extract domain from URL
            const urlDomain = this.extractDomain(url);
            const senderDomain = this.extractDomainFromEmail(senderEmail);
            
            // Check if URL domain matches sender domain
            if (senderDomain && urlDomain && urlDomain !== senderDomain) {
                authenticityScore -= 30; // Domain mismatch
            }
            
            // Check for suspicious patterns
            if (this.hasSuspiciousPatterns([url])) {
                authenticityScore -= 25;
            }
            
            // Check for URL shorteners
            if (this.hasUrlShorteners([url])) {
                authenticityScore -= 20;
            }
            
            // Check for IP addresses
            if (this.hasIpAddresses([url])) {
                authenticityScore -= 35;
            }
            
            // Check for HTTP (non-secure)
            if (this.hasHttpLinks([url])) {
                authenticityScore -= 15;
            }
        }
        
        return Math.max(0, Math.min(100, authenticityScore));
    }

    hasSuspiciousPatterns(urls) {
        const suspiciousPatterns = [
            /[a-z0-9]+-[a-z0-9]+\.(com|net|org)/i,
            /free|click|link|verify|secure/i
        ];
        
        return urls.some(url => {
            return suspiciousPatterns.some(pattern => pattern.test(url));
        });
    }

    hasUrlShorteners(urls) {
        const shortenerPatterns = [
            /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link|ow\.ly|is\.gd/i
        ];
        
        return urls.some(url => {
            return shortenerPatterns.some(pattern => pattern.test(url));
        });
    }

    hasIpAddresses(urls) {
        const ipPattern = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
        return urls.some(url => ipPattern.test(url));
    }

    hasHttpLinks(urls) {
        return urls.some(url => url.startsWith('http://'));
    }

    checkDomainMismatch(urls, senderEmail) {
        if (urls.length === 0 || !senderEmail) return false;
        
        const senderDomain = this.extractDomainFromEmail(senderEmail);
        if (!senderDomain) return false;
        
        return urls.some(url => {
            const urlDomain = this.extractDomain(url);
            return urlDomain && urlDomain !== senderDomain;
        });
    }

    extractDomain(url) {
        try {
            const match = url.match(/https?:\/\/([^\/]+)/i);
            if (match) {
                return match[1].toLowerCase().replace(/^www\./, '');
            }
        } catch (e) {}
        return null;
    }

    extractDomainFromEmail(email) {
        if (!email || !email.includes('@')) return null;
        const parts = email.split('@');
        if (parts.length > 1) {
            return parts[1].toLowerCase();
        }
        return null;
    }
}

/**
 * Keyword Analyzer - Analyzes keywords and phrases in email
 */
class KeywordAnalyzer {
    constructor() {
        this.urgencyKeywords = ['urgent', 'immediate', 'critical', 'asap', 'action required', 
                               'verify now', 'confirm immediately', 'expires soon', 'limited time'];
        this.credentialKeywords = ['password', 'credentials', 'login', 'account', 'verify account', 
                                  'update account', 'suspended', 'locked', 'reset password'];
        this.financialKeywords = ['payment', 'invoice', 'refund', 'transaction', 'wire transfer', 
                                  'unauthorized charge', 'billing', 'overdue'];
        this.securityKeywords = ['security breach', 'unauthorized access', 'suspicious activity', 
                                'fraud detected', 'verify identity', 'security alert'];
        this.threatKeywords = ['account closed', 'terminate', 'expire', 'delete', 'permanent', 
                              'legal action', 'suspended'];
        this.callToActionKeywords = ['click here', 'verify', 'confirm', 'update', 'reactivate', 
                                    'restore', 'unlock', 'click the link'];
        this.suspiciousPhrases = ['click the link below', 'verify your identity', 'confirm your account',
                                 'update your information', 'your account has been'];
        this.authorityKeywords = ['bank', 'irs', 'fbi', 'government', 'court', 'legal', 'police', 
                                  'federal', 'official'];
        this.scarcityKeywords = ['limited time', 'expires soon', 'last chance', 'only today', 
                                'act now', 'don\'t miss'];
        this.consistencyKeywords = ['your account', 'your profile', 'your information', 'we noticed',
                                   'your data', 'your details'];
    }

    countUrgencyKeywords(subject, content) {
        return this.countKeywords(subject + ' ' + content, this.urgencyKeywords);
    }

    countCredentialKeywords(subject, content) {
        return this.countKeywords(subject + ' ' + content, this.credentialKeywords);
    }

    countFinancialKeywords(subject, content) {
        return this.countKeywords(subject + ' ' + content, this.financialKeywords);
    }

    countSecurityKeywords(subject, content) {
        return this.countKeywords(subject + ' ' + content, this.securityKeywords);
    }

    countThreatKeywords(subject, content) {
        return this.countKeywords(subject + ' ' + content, this.threatKeywords);
    }

    countCallToActionKeywords(content) {
        return this.countKeywords(content, this.callToActionKeywords);
    }

    countSuspiciousPhrases(content) {
        return this.countKeywords(content, this.suspiciousPhrases);
    }

    hasAuthorityImpersonation(content) {
        return this.countKeywords(content, this.authorityKeywords) > 0;
    }

    hasScarcityTactics(content) {
        return this.countKeywords(content, this.scarcityKeywords) > 0;
    }

    hasConsistencyTactics(content) {
        return this.countKeywords(content, this.consistencyKeywords) >= 2;
    }

    countKeywords(text, keywords) {
        let count = 0;
        const lowerText = text.toLowerCase();
        for (const keyword of keywords) {
            const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
                count += matches.length;
            }
        }
        return count;
    }
}

/**
 * Sender Analyzer - Analyzes sender email authenticity
 */
class SenderAnalyzer {
    analyzeAuthenticity(senderEmail, senderName) {
        if (!senderEmail) return 50; // Unknown sender
        
        let score = 100;
        
        // Check for suspicious patterns
        if (this.hasSuspiciousPattern(senderEmail)) {
            score -= 30;
        }
        
        // Check domain reputation
        const domainRep = this.analyzeDomainReputation(senderEmail);
        score += (domainRep - 50); // Adjust based on domain reputation
        
        // Check for generic addresses
        if (senderEmail.includes('noreply') || senderEmail.includes('no-reply')) {
            score -= 10;
        }
        
        // Check for numbers in domain (suspicious)
        if (senderEmail.match(/[0-9]{4,}/)) {
            score -= 15;
        }
        
        return Math.max(0, Math.min(100, score));
    }

    hasSuspiciousPattern(senderEmail) {
        const suspiciousPatterns = [
            /noreply|no-reply|donotreply/i,
            /support[0-9]|security[0-9]|admin[0-9]/i,
            /[a-z]+[0-9]+@/i
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(senderEmail));
    }

    analyzeDomainReputation(senderEmail) {
        if (!senderEmail || !senderEmail.includes('@')) return 50;
        
        const domain = senderEmail.split('@')[1].toLowerCase();
        
        // Known good domains (in a real system, this would be a database)
        const trustedDomains = ['securebank.com', 'bank.com', 'company.com', 'corp.com'];
        if (trustedDomains.some(td => domain.includes(td))) {
            return 90;
        }
        
        // Suspicious domain patterns
        if (domain.length < 8 || domain.includes('free') || domain.includes('click')) {
            return 30;
        }
        
        // Generic score
        return 60;
    }
}

/**
 * Grammar Analyzer - Analyzes grammar, spelling, and professionalism
 */
class GrammarAnalyzer {
    analyzeGrammar(content) {
        if (!content || content.length < 10) return 50;
        
        let score = 100;
        
        // Check for common grammar mistakes
        const grammarMistakes = [
            /youre account/i,
            /your account is been/i,
            /please to click/i,
            /kindly do the needful/i,
            /urgent require/i,
            /is been/i,
            /has been been/i
        ];
        
        for (const mistake of grammarMistakes) {
            if (mistake.test(content)) {
                score -= 15;
            }
        }
        
        // Check for excessive capitalization
        const words = content.split(/\s+/);
        const allCapsWords = words.filter(w => w === w.toUpperCase() && w.length > 2).length;
        if (allCapsWords > words.length * 0.1) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }

    analyzeSpelling(content) {
        if (!content) return 50;
        
        // Simple heuristic: check for repeated characters (common in spam)
        const repeatedChars = content.match(/(.)\1{3,}/g);
        if (repeatedChars && repeatedChars.length > 2) {
            return 40;
        }
        
        // Check for excessive special characters
        const specialCharRatio = (content.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length / content.length;
        if (specialCharRatio > 0.1) {
            return 45;
        }
        
        return 70; // Default decent score
    }

    analyzeProfessionalism(content) {
        if (!content) return 50;
        
        let score = 50;
        
        // Professional indicators
        const professionalIndicators = [
            'please', 'thank you', 'sincerely', 'best regards', 'regards',
            'dear', 'yours truly', 'respectfully'
        ];
        
        for (const indicator of professionalIndicators) {
            if (content.toLowerCase().includes(indicator)) {
                score += 5;
            }
        }
        
        // Professional structure
        if (this.hasProfessionalGreeting(content) && this.hasProfessionalClosing(content)) {
            score += 20;
        }
        
        // Phone number or contact info
        if (content.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)) {
            score += 10;
        }
        
        // Company information
        if (content.match(/company|corporation|inc\.|llc|limited/i)) {
            score += 5;
        }
        
        return Math.min(100, score);
    }

    hasProfessionalGreeting(content) {
        const greetings = ['dear', 'hello', 'hi', 'greetings', 'good morning', 'good afternoon'];
        return greetings.some(g => content.toLowerCase().includes(g));
    }

    hasProfessionalClosing(content) {
        const closings = ['sincerely', 'best regards', 'regards', 'yours truly', 'respectfully', 
                         'thank you', 'thanks'];
        return closings.some(c => content.toLowerCase().includes(c));
    }

    hasExcessivePunctuation(subject) {
        if (!subject) return false;
        const punctuationCount = (subject.match(/[!?]{2,}/g) || []).length;
        return punctuationCount > 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DecisionTreeClassifier;
}

