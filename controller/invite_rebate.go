package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func getInviteTargetUserID(c *gin.Context, adminMode bool) (int, error) {
	if adminMode {
		return strconv.Atoi(c.Param("id"))
	}
	return c.GetInt("id"), nil
}

func GetInviteSummary(c *gin.Context) {
	userID, err := getInviteTargetUserID(c, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	summary, err := model.GetInviteSummary(userID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}

func AdminGetInviteSummary(c *gin.Context) {
	userID, err := getInviteTargetUserID(c, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	summary, err := model.GetInviteSummary(userID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}

func GetInviteUsers(c *gin.Context) {
	userID, err := getInviteTargetUserID(c, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo := common.GetPageQuery(c)
	items, total, err := model.GetInviteUsers(userID, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminGetInviteUsers(c *gin.Context) {
	userID, err := getInviteTargetUserID(c, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo := common.GetPageQuery(c)
	items, total, err := model.GetInviteUsers(userID, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func GetInviteRebates(c *gin.Context) {
	userID, err := getInviteTargetUserID(c, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo := common.GetPageQuery(c)
	items, total, err := model.GetInviteRebates(userID, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminGetInviteRebates(c *gin.Context) {
	userID, err := getInviteTargetUserID(c, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo := common.GetPageQuery(c)
	items, total, err := model.GetInviteRebates(userID, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}
