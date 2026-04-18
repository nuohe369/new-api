package main

import (
	"fmt"
	"os"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	_ "github.com/QuantumNous/new-api/setting/performance_setting"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	common.InitEnv()

	if err := model.InitDB(); err != nil {
		panic(err)
	}
	defer func() {
		_ = model.CloseDB()
	}()

	model.InitOptionMap()

	result, err := model.RebuildInviteRebateData()
	if err != nil {
		fmt.Fprintf(os.Stderr, "rebuild invite rebate failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("invite rebate rebuild completed\n")
	fmt.Printf("invite_users=%d\n", result.InviteUsers)
	fmt.Printf("success_topups=%d\n", result.SuccessTopups)
	fmt.Printf("rebate_record_count=%d\n", result.RebateRecordCount)
	fmt.Printf("inviter_count=%d\n", result.InviterCount)
	fmt.Printf("rebuilt_aff_quota_sum=%d\n", result.RebuiltAffQuotaSum)
}
