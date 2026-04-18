package controller

import "github.com/QuantumNous/new-api/common"

func isPaymentDisabled() bool {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	return common.OptionMap["DisablePayment"] == "true"
}
