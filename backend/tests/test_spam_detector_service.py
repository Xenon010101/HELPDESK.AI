import pytest
from backend.services.spam_detector_service import analyze_spam_phishing, is_domain_safe

def test_analyze_clean_text():
    # Clean text should not be flagged as spam
    result = analyze_spam_phishing("Hello, I need help with my email account. It keeps logging me out.")
    assert result["is_spam"] is False
    assert result["risk_level"] == "none"
    assert len(result["reasons"]) == 0
    assert len(result["suspicious_urls"]) == 0

def test_analyze_phishing_keywords():
    # Text with phishing keywords should trigger high risk
    result = analyze_spam_phishing("verify your account immediately and confirm your password.")
    assert result["is_spam"] is True
    assert result["risk_level"] in ["medium", "high"]
    assert any("verify your account" in reason.lower() for reason in result["reasons"])

def test_analyze_spam_keywords():
    # Text with spam keywords should trigger medium risk
    result = analyze_spam_phishing("Congratulations, you are a lottery winner! Get your cash prize now.")
    assert result["is_spam"] is True
    assert result["risk_level"] in ["medium", "high"]

def test_analyze_suspicious_urls():
    # Text with a suspicious TLD link should be flagged
    result = analyze_spam_phishing("Check out this site: http://free-money.xyz")
    assert result["is_spam"] is True
    assert "http://free-money.xyz" in result["suspicious_urls"]
    assert any("suspicious tld" in reason.lower() for reason in result["reasons"])

def test_analyze_empty_string():
    # Empty string should not be spam
    result = analyze_spam_phishing("")
    assert result["is_spam"] is False
    assert result["risk_level"] == "none"

def test_analyze_safe_domains():
    # Safe domains should not trigger suspicion
    result = analyze_spam_phishing("See our repo at https://github.com/ritesh-1918/HELPDESK.AI")
    assert result["is_spam"] is False
    assert result["risk_level"] == "none"
    assert len(result["suspicious_urls"]) == 0

def test_analyze_high_link_density():
    # Too many links should flag as spam
    text = "Links: http://a.com http://b.com http://c.com http://d.com http://e.com http://f.com"
    result = analyze_spam_phishing(text)
    assert result["is_spam"] is True
    assert any("link density" in reason.lower() for reason in result["reasons"])

def test_is_domain_safe():
    assert is_domain_safe("google.com") is True
    assert is_domain_safe("sub.github.com") is True
    assert is_domain_safe("malicious.xyz") is False
