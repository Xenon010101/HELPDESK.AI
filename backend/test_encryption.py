"""
Tests for AES-256-GCM Encryption Utility

This module tests the encryption and decryption functions to ensure
they work correctly and securely.
"""

import os
import pytest

# Set a test encryption key BEFORE importing the encryption module
os.environ["AES_ENCRYPTION_KEY"] = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

from encryption import encrypt_pii, decrypt_pii, is_encrypted

def test_encrypt_decrypt_roundtrip():
    """Test that encrypting and decrypting returns the original text."""
    plaintext = "This is a sensitive ticket subject"
    encrypted = encrypt_pii(plaintext)
    decrypted = decrypt_pii(encrypted)
    assert decrypted == plaintext

def test_encrypt_decrypt_empty_string():
    """Test that empty strings are handled correctly."""
    assert encrypt_pii("") == ""
    assert decrypt_pii("") == ""

def test_encrypt_decrypt_none():
    """Test that None values are handled correctly."""
    assert encrypt_pii(None) is None
    assert decrypt_pii(None) is None

def test_encrypt_produces_different_output():
    """Test that encrypting the same text twice produces different ciphertext."""
    plaintext = "Same text"
    encrypted1 = encrypt_pii(plaintext)
    encrypted2 = encrypt_pii(plaintext)
    # Should be different due to random nonce
    assert encrypted1 != encrypted2
    # But both should decrypt to the same plaintext
    assert decrypt_pii(encrypted1) == plaintext
    assert decrypt_pii(encrypted2) == plaintext

def test_is_encrypted():
    """Test the is_encrypted function."""
    plaintext = "Not encrypted"
    encrypted = encrypt_pii("Encrypted text")
    
    assert not is_encrypted(plaintext)
    assert is_encrypted(encrypted)
    assert not is_encrypted("")
    assert not is_encrypted(None)

def test_encrypt_decrypt_long_text():
    """Test encryption of long text."""
    plaintext = "A" * 10000  # 10KB of text
    encrypted = encrypt_pii(plaintext)
    decrypted = decrypt_pii(encrypted)
    assert decrypted == plaintext

def test_encrypt_decrypt_unicode():
    """Test encryption of unicode text."""
    plaintext = "日本語のテスト 🎉 Émojis and spëcial chars"
    encrypted = encrypt_pii(plaintext)
    decrypted = decrypt_pii(encrypted)
    assert decrypted == plaintext

def test_decrypt_invalid_data():
    """Test that decrypting invalid data raises an error."""
    with pytest.raises(ValueError):
        decrypt_pii("invalid-base64-data")

def test_decrypt_tampered_data():
    """Test that decrypting tampered data raises an error."""
    encrypted = encrypt_pii("Test")
    # Tamper with the encrypted data
    tampered = encrypted[:-2] + "XX"
    with pytest.raises(ValueError):
        decrypt_pii(tampered)

if __name__ == "__main__":
    pytest.main([__file__])