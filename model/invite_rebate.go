package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

const (
	InviteRebateStatusSettled = 1
	InviteRebateStatusRevoked = 2
)

type InviteRebateRecord struct {
	Id             int    `json:"id"`
	InviterUserId  int    `json:"inviter_user_id" gorm:"index"`
	InviteeUserId  int    `json:"invitee_user_id" gorm:"index"`
	TopUpId        int    `json:"topup_id" gorm:"index"`
	TradeNo        string `json:"trade_no" gorm:"type:varchar(255);uniqueIndex"`
	PaymentMethod  string `json:"payment_method" gorm:"type:varchar(50)"`
	CreditedQuota  int    `json:"credited_quota"`
	RebateRateBP   int    `json:"rebate_rate_bp"`
	RebateQuota    int    `json:"rebate_quota"`
	Status         int    `json:"status" gorm:"type:int;default:1;index"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint;index"`
	UpdatedAt      int64  `json:"updated_at" gorm:"bigint"`
	Remark         string `json:"remark" gorm:"type:varchar(255);default:''"`
	InviteeDisplay string `json:"invitee_display" gorm:"-"`
}

type InviteSummary struct {
	AffCode               string `json:"aff_code"`
	AffCount              int    `json:"aff_count"`
	AffQuota              int    `json:"aff_quota"`
	AffHistoryQuota       int    `json:"aff_history_quota"`
	InviteTopupRebateRate int    `json:"invite_topup_rebate_rate"`
}

type InviteUserItem struct {
	Id               int    `json:"id"`
	Username         string `json:"username"`
	Email            string `json:"email"`
	DisplayName      string `json:"display_name"`
	HasTopup         bool   `json:"has_topup"`
	TopupCount       int64  `json:"topup_count"`
	LastTopupTime    int64  `json:"last_topup_time"`
	TotalRebateQuota int64  `json:"total_rebate_quota"`
}

func (r *InviteRebateRecord) BeforeCreate(_ *gorm.DB) error {
	now := common.GetTimestamp()
	if r.CreatedAt == 0 {
		r.CreatedAt = now
	}
	if r.UpdatedAt == 0 {
		r.UpdatedAt = now
	}
	return nil
}

func (r *InviteRebateRecord) BeforeUpdate(_ *gorm.DB) error {
	r.UpdatedAt = common.GetTimestamp()
	return nil
}

func buildInviteeDisplay(username string, email string, userID int) string {
	if username != "" {
		return username
	}
	if email == "" {
		return fmt.Sprintf("UID-%d", userID)
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return email
	}
	local := parts[0]
	if len(local) <= 2 {
		return "***@" + parts[1]
	}
	return local[:2] + "***@" + parts[1]
}

func settleInviteRebateTx(tx *gorm.DB, topUp *TopUp, creditedQuota int) error {
	if tx == nil || topUp == nil || creditedQuota <= 0 {
		return nil
	}
	if common.InviteTopupRebateRate <= 0 {
		return nil
	}
	if topUp.TradeNo == "" {
		return errors.New("invite rebate settle failed: empty trade no")
	}

	var exists InviteRebateRecord
	err := tx.Select("id").Where("trade_no = ?", topUp.TradeNo).First(&exists).Error
	if err == nil {
		return nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	var invitee User
	if err = tx.Select("id", "inviter_id", "username", "email").Where("id = ?", topUp.UserId).First(&invitee).Error; err != nil {
		return err
	}
	if invitee.InviterId == 0 || invitee.InviterId == invitee.Id {
		return nil
	}

	rebateQuota := creditedQuota * common.InviteTopupRebateRate / 10000
	record := InviteRebateRecord{
		InviterUserId: invitee.InviterId,
		InviteeUserId: invitee.Id,
		TopUpId:       topUp.Id,
		TradeNo:       topUp.TradeNo,
		PaymentMethod: topUp.PaymentMethod,
		CreditedQuota: creditedQuota,
		RebateRateBP:  common.InviteTopupRebateRate,
		RebateQuota:   rebateQuota,
		Status:        InviteRebateStatusSettled,
		Remark:        buildInviteeDisplay(invitee.Username, invitee.Email, invitee.Id),
	}
	if err = tx.Create(&record).Error; err != nil {
		return err
	}
	if rebateQuota <= 0 {
		return nil
	}
	return tx.Model(&User{}).Where("id = ?", invitee.InviterId).Updates(map[string]interface{}{
		"aff_quota":   gorm.Expr("aff_quota + ?", rebateQuota),
		"aff_history": gorm.Expr("aff_history + ?", rebateQuota),
	}).Error
}

func SettleInviteRebateForTopUpTx(tx *gorm.DB, topUp *TopUp, creditedQuota int) error {
	return settleInviteRebateTx(tx, topUp, creditedQuota)
}

func GetInviteSummary(userID int) (*InviteSummary, error) {
	user, err := GetUserById(userID, true)
	if err != nil {
		return nil, err
	}
	return &InviteSummary{
		AffCode:               user.AffCode,
		AffCount:              user.AffCount,
		AffQuota:              user.AffQuota,
		AffHistoryQuota:       user.AffHistoryQuota,
		InviteTopupRebateRate: common.InviteTopupRebateRate,
	}, nil
}

func GetInviteUsers(userID int, pageInfo *common.PageInfo) ([]*InviteUserItem, int64, error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var total int64
	baseQuery := tx.Model(&User{}).Where("inviter_id = ?", userID)
	if err := baseQuery.Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	topupSubQuery := tx.Model(&TopUp{}).
		Select("user_id, COUNT(*) AS topup_count, MAX(complete_time) AS last_topup_time").
		Where("status = ?", common.TopUpStatusSuccess).
		Group("user_id")
	rebateSubQuery := tx.Model(&InviteRebateRecord{}).
		Select("invitee_user_id, SUM(rebate_quota) AS total_rebate_quota").
		Where("inviter_user_id = ? AND status = ?", userID, InviteRebateStatusSettled).
		Group("invitee_user_id")

	var items []*InviteUserItem
	err := tx.Table("users").
		Select("users.id, users.username, users.email, users.display_name, "+
			"COALESCE(t.topup_count, 0) AS topup_count, "+
			"COALESCE(t.last_topup_time, 0) AS last_topup_time, "+
			"COALESCE(r.total_rebate_quota, 0) AS total_rebate_quota").
		Joins("LEFT JOIN (?) AS t ON t.user_id = users.id", topupSubQuery).
		Joins("LEFT JOIN (?) AS r ON r.invitee_user_id = users.id", rebateSubQuery).
		Where("users.inviter_id = ?", userID).
		Order("users.id DESC").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Scan(&items).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}
	for _, item := range items {
		item.HasTopup = item.TopupCount > 0
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func GetInviteRebates(userID int, pageInfo *common.PageInfo) ([]*InviteRebateRecord, int64, error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&InviteRebateRecord{}).Where("inviter_user_id = ?", userID)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	var records []*InviteRebateRecord
	if err := query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&records).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}
	for _, record := range records {
		record.InviteeDisplay = record.Remark
	}

	if err := tx.Commit().Error; err != nil {
		return nil, 0, err
	}
	return records, total, nil
}
