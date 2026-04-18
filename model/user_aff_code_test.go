package model

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateAffCodeFormat(t *testing.T) {
	require.NoError(t, ValidateAffCodeFormat(""))
	require.NoError(t, ValidateAffCodeFormat("Invite_01-code"))

	require.ErrorContains(t, ValidateAffCodeFormat("邀请码"), "邀请码只能包含")
	require.ErrorContains(t, ValidateAffCodeFormat("bad code"), "邀请码只能包含")
	require.ErrorContains(t, ValidateAffCodeFormat(strings.Repeat("a", 33)), "邀请码只能包含")
}

func TestPrepareAffCodeRejectsDuplicateButAllowsOwner(t *testing.T) {
	truncateTables(t)

	user := &User{
		Username:    "aff_owner",
		Password:    "Password123",
		DisplayName: "aff_owner",
		AffCode:     "owner-code",
	}
	require.NoError(t, user.Insert(0))

	_, err := PrepareAffCode("owner-code", 0)
	require.ErrorContains(t, err, "邀请码已存在")

	code, err := PrepareAffCode("owner-code", user.Id)
	require.NoError(t, err)
	assert.Equal(t, "owner-code", code)
}

func TestInsertUsesCustomAffCodeAndGeneratesFallback(t *testing.T) {
	truncateTables(t)

	customUser := &User{
		Username:    "aff_custom",
		Password:    "Password123",
		DisplayName: "aff_custom",
		AffCode:     "custom-code",
	}
	require.NoError(t, customUser.Insert(0))
	assert.Equal(t, "custom-code", customUser.AffCode)

	var storedCustom User
	require.NoError(t, DB.First(&storedCustom, customUser.Id).Error)
	assert.Equal(t, "custom-code", storedCustom.AffCode)

	autoUser := &User{
		Username:    "aff_auto",
		Password:    "Password123",
		DisplayName: "aff_auto",
	}
	require.NoError(t, autoUser.Insert(0))
	assert.NotEmpty(t, autoUser.AffCode)
	assert.Len(t, autoUser.AffCode, 4)
	require.NoError(t, ValidateAffCodeFormat(autoUser.AffCode))

	var storedAuto User
	require.NoError(t, DB.First(&storedAuto, autoUser.Id).Error)
	assert.Equal(t, autoUser.AffCode, storedAuto.AffCode)
}
