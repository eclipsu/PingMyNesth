package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "test-secret"

func TestTokenRoundTrip(t *testing.T) {
	tok, err := GenerateToken(secret, 7, "a@usm.edu", 3)
	if err != nil {
		t.Fatal(err)
	}
	c, err := ParseToken(secret, tok)
	if err != nil {
		t.Fatal(err)
	}
	if c.UserID != 7 || c.Email != "a@usm.edu" || c.Version != 3 {
		t.Errorf("claims = %+v", c)
	}
	if ttl := time.Until(c.ExpiresAt.Time); ttl > AccessTokenTTL || ttl < AccessTokenTTL-time.Minute {
		t.Errorf("access token ttl = %v", ttl)
	}
}

func TestRejectsWrongSecretExpiredAndOtherAlgs(t *testing.T) {
	tok, _ := GenerateToken(secret, 1, "a@usm.edu", 0)
	if _, err := ParseToken("other-secret", tok); err == nil {
		t.Error("accepted token signed with a different secret")
	}

	expired := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{UserID: 1, RegisteredClaims: jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
	}})
	s, _ := expired.SignedString([]byte(secret))
	if _, err := ParseToken(secret, s); err == nil {
		t.Error("accepted expired token")
	}

	noExp := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{UserID: 1})
	s, _ = noExp.SignedString([]byte(secret))
	if _, err := ParseToken(secret, s); err == nil {
		t.Error("accepted token without exp")
	}

	hs512 := jwt.NewWithClaims(jwt.SigningMethodHS512, Claims{UserID: 1, RegisteredClaims: jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
	}})
	s, _ = hs512.SignedString([]byte(secret))
	if _, err := ParseToken(secret, s); err == nil {
		t.Error("accepted HS512 token; only HS256 is allowed")
	}

	none := jwt.NewWithClaims(jwt.SigningMethodNone, Claims{UserID: 1})
	s, _ = none.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if _, err := ParseToken(secret, s); err == nil {
		t.Error(`accepted alg "none" token`)
	}
}

func TestRefreshTokensAreRandomAndHashed(t *testing.T) {
	a, ha, _ := NewRefreshToken()
	b, hb, _ := NewRefreshToken()
	if a == b || ha == hb {
		t.Fatal("refresh tokens repeated")
	}
	if ha == a || HashRefreshToken(a) != ha || len(a) < 40 {
		t.Errorf("unexpected token/hash: %q %q", a, ha)
	}
}
