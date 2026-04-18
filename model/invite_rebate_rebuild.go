package model

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

type InviteRebateRebuildResult struct {
	InviteUsers        int64 `json:"invite_users"`
	SuccessTopups      int64 `json:"success_topups"`
	RebateRecordCount  int64 `json:"rebate_record_count"`
	InviterCount       int64 `json:"inviter_count"`
	RebuiltAffQuotaSum int64 `json:"rebuilt_aff_quota_sum"`
}

func RebuildInviteRebateData() (*InviteRebateRebuildResult, error) {
	result := &InviteRebateRebuildResult{}

	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&InviteRebateRecord{}).Error; err != nil {
			return err
		}
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Model(&User{}).Updates(map[string]interface{}{
			"aff_quota":   0,
			"aff_history": 0,
			"aff_count":   0,
		}).Error; err != nil {
			return err
		}

		if err := tx.Model(&User{}).Where("inviter_id <> 0").Count(&result.InviteUsers).Error; err != nil {
			return err
		}
		if err := tx.Model(&TopUp{}).Where("status = ?", common.TopUpStatusSuccess).Count(&result.SuccessTopups).Error; err != nil {
			return err
		}

		type inviterAgg struct {
			InviterId int
			Count     int
		}
		var inviterAggs []inviterAgg
		if err := tx.Model(&User{}).
			Select("inviter_id, COUNT(*) AS count").
			Where("inviter_id <> 0").
			Group("inviter_id").
			Scan(&inviterAggs).Error; err != nil {
			return err
		}
		for _, agg := range inviterAggs {
			if err := tx.Model(&User{}).Where("id = ?", agg.InviterId).Update("aff_count", agg.Count).Error; err != nil {
				return err
			}
		}
		result.InviterCount = int64(len(inviterAggs))

		var topUps []*TopUp
		if err := tx.Order("id asc").Where("status = ?", common.TopUpStatusSuccess).Find(&topUps).Error; err != nil {
			return err
		}
		for _, topUp := range topUps {
			creditedQuota := ComputeCreditedQuotaForTopUp(topUp)
			if creditedQuota <= 0 {
				continue
			}
			if err := settleInviteRebateTx(tx, topUp, creditedQuota); err != nil {
				return fmt.Errorf("rebuild invite rebate failed for topup %s: %w", topUp.TradeNo, err)
			}
		}

		if err := tx.Model(&InviteRebateRecord{}).Count(&result.RebateRecordCount).Error; err != nil {
			return err
		}
		type quotaAgg struct {
			Total int64
		}
		var agg quotaAgg
		if err := tx.Model(&User{}).Select("COALESCE(SUM(aff_quota), 0) AS total").Scan(&agg).Error; err != nil {
			return err
		}
		result.RebuiltAffQuotaSum = agg.Total
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
