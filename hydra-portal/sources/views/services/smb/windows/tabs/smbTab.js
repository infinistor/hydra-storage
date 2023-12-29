/*
* Copyright (c) 2021 PSPACE, inc. KSAN Development Team ksan@pspace.co.kr
* KSAN is a suite of free software: you can redistribute it and/or modify it under the terms of
* the GNU General Public License as published by the Free Software Foundation, either version
* 3 of the License.  See LICENSE for details
*
* 본 프로그램 및 관련 소스코드, 문서 등 모든 자료는 있는 그대로 제공이 됩니다.
* KSAN 프로젝트의 개발자 및 개발사는 이 프로그램을 사용한 결과에 따른 어떠한 책임도 지지 않습니다.
* KSAN 개발팀은 사전 공지, 허락, 동의 없이 KSAN 개발에 관련된 모든 결과물에 대한 LICENSE 방식을 변경 할 권리가 있습니다.
 */
import { JetView } from "webix-jet";
import AdvancedSettingsAccordion from "./advancedSettingsAccordion";

import { ipAddressStringValidator } from "../../../../../functions/IPAddressValidation";

export default class SMBTab extends JetView {
	config() {
		const labelWidth = 230

		return {
			id: "SMB",
			css: "allowOverflow",
			view: "form",
			borderless: true,
			paddingY: 0,
			elements: [
				{
					rows: [
						{
							padding: {
								top: 0, left: 8, right: 8, bottom: 0
							},
							rows: [
								{ view: "switch", id: "smbEnableSwitch", label: "Enable", labelWidth: labelWidth, value: 0, },
								{ view: "switch", id: "smbBrowsableSwitch", label: "Browsable", labelWidth: labelWidth, value: 1 },
								{ view: "switch", id: "smbReadOnlySwitch", label: "Read Only", labelWidth: labelWidth, value: 0 },
								{ view: "switch", id: "smbGuestAccessSwitch", label: "Guest Access", labelWidth: labelWidth, value: 0 },
								{ view: "radio", id: "smbCaseSensiticeRadio", label: "Case Sensitive", labelWidth: labelWidth, options: ["Auto", "Yes", "No"], value: "Auto" },
								{
									view: "richselect", id: "smbNetworkAccessSelect", label: "Network Access Restrictions", labelWidth: labelWidth,
									options: ["Disabled", "Allow access to specific IP/network addresses", "Deny access to specific IP/network address"], value: "Disabled", on: {
										onChange: function (newv, oldv) {
											if (newv == "Allow access to specific IP/network addresses") {
												$$("smbNetworkAllowText").show();
												$$("smbNetworkDenyText").hide();
												$$("smbNetworkAllowExceptText").show();
												$$("smbNetworkDenyExceptText").hide();
											} else if (newv == "Deny access to specific IP/network address") {
												$$("smbNetworkAllowText").hide();
												$$("smbNetworkDenyText").show();
												$$("smbNetworkDenyExceptText").show();
												$$("smbNetworkAllowExceptText").hide();
											} else {
												$$("smbNetworkAllowText").hide();
												$$("smbNetworkDenyText").hide();
												$$("smbNetworkAllowExceptText").hide();
												$$("smbNetworkDenyExceptText").hide();
											}
										}
									}
								},
								{
									padding: {
										left: 12 + labelWidth, top: 0, right: 0, bottom: 0
									},
									rows: [
										{ view: "text", id: "smbNetworkAllowText", label: "Allow", name: "allow", labelWidth: 70, hidden: true },
										{ view: "text", id: "smbNetworkDenyText", label: "Deny", name: "deny", labelWidth: 70, hidden: true },
										{ view: "text", id: "smbNetworkAllowExceptText", label: "Except", name: "allow_except", labelWidth: 70, hidden: true },
										{ view: "text", id: "smbNetworkDenyExceptText", label: "Except", name: "deny_except", labelWidth: 70, hidden: true },
									]
								},
								// { view: "switch", id: "smbSupportForMacOSSwitch", label: "Support for macOS", labelWidth: labelWidth, labelRight: "Optimization for macOS" },
								{ view: "switch", id: "smbSupportForMacOSSpotlightRadio", label: "", labelWidth: labelWidth, labelRight: "Support macOS Spotlight Search", hidden: true },
								{
									view: "switch", id: "smbWORMSwitch", label: "WORM", labelWidth: labelWidth, value: 0, on: {
										onChange: function (newv, oldv) {
											if (newv == 1) {
												$$("smbWORMSettings").show();
											} else {
												$$("smbWORMSettings").hide();
											}
										}
									},
								},
								{
									id: "smbWORMSettings",
									hidden: true,
									padding: 0,
									cols: [
										{ view: "label", label: "Grace Period", width: labelWidth },
										{
											view: "text", id: "smbGracePeriodNumber", name: "grace_period", value: "5", on: {
												onKeyPress: function (code, e) {
													// only allow numbers and backspace, delete, left arrow, right arrow, tab, and enter
													// allow only numbers and backspace, tab, enter, delete, arrows
													if (code < 48 || code > 57) {
														if (code == 8 || code == 9 || code == 13 || code == 46 || (code >= 37 && code <= 40)) {
															return true;
														} else {
															return false;
														}
													} else {
														return true;
													}
												}
											}
										},
										{ view: "richselect", id: "smbGracePeriodSelect", width: 150, options: ["seconds", "minutes", "hours"], value: "minutes" },
									]
								}
							]
						},
						{
							height: 10
						},
						{
							view: "accordion",
							multi: true,
							rows: [
								{
									header: "<span class='advancedSettings'>Advanced Settings</span>", id: "smbAdvancedSettingsAccordion", borderless: true, collapsed: true, body: AdvancedSettingsAccordion, css: "advancedSettingsAccordion"
								},
							]
						},
						{},
					]
				},
			],
			rules: {
				"allow": (value) => ipAddressStringValidator(value),
				"deny": (value) => ipAddressStringValidator(value),
				"allow_except": (value) => ipAddressStringValidator(value),
				"deny_except": (value) => ipAddressStringValidator(value),
				"grace_period": (value) => {
					if ($$("smbWORMSwitch").getValue() == 1) {
						return value.length > 0
					}
					return true
				}
			}
		}
	}
	init() {
		this.resizeElement()
	}
	ready() {
		var resize = this.resizeElement
		webix.event(window, "resize", function () {
			resize()
		})
	}
	resizeElement() {
		const SMBTab = $$("SMB")

		if (SMBTab) {
			const topBar = 48
			const topPart = 120
			const buttonToolbar = 50
			const tabHeaders = 100
			var html = document.documentElement;

			var height = html.offsetHeight


			SMBTab.config.height = height - (topBar + topPart + buttonToolbar + tabHeaders)
			SMBTab.resize()
		}
	}
}