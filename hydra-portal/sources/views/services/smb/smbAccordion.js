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

import { isKeyValidLatinOrNumber } from "../../../functions/validation";
import { ajaxFail } from "../../../functions/ajaxFail";

export default class SMBAccordion extends JetView {
	config() {
		const labelWidth = 300
		return {
			rows: [
				{
					view: "form",
					id: "smbConfigForm",
					borderless: true,
					elements: [
						{
							cols: [
								{
									width: 600,
									rows: [
										{
											view: "switch", id: "smbConfigEnable", label: "Enable SMB Service", labelWidth: labelWidth,
										},
										{
											view: "text", id: "smbConfigWorkgroup", label: "Workgroup", labelWidth: labelWidth, name: "workgroup", invalidMessage: "Cannot be empty", on: {
												onKeyPress: function (code, e) {
													// Allow only latin letters and numbers, backspace, tab, delete, left and right arrows + slash
													return isKeyValidLatinOrNumber(code, e) || code == 47
												}
											}
										},
										{
											view: "multiselect", id: "smbConfigBindInterfaces", label: "Bind Network Interfaces", labelWidth: labelWidth, name: "bind_interfaces", on: {
												onChange(newVal, oldVal) {
													// check if the last value is "Allow All Interfaces" and value.length > 1
													if (newVal.length > 1 && newVal[newVal.length - 1] == "Allow All Interfaces") {
														$$("smbConfigBindInterfaces").setValue(["Allow All Interfaces"])
														return
													}

													// check if value.length > 1 and "Allow All Interfaces" is selected and remove it from value
													if (newVal.length > 1 && newVal.indexOf("Allow All Interfaces") != -1) {
														// remove "Allow All Interfaces" from value
														$$("smbConfigBindInterfaces").setValue(newVal.filter(function (item) {
															return item != "Allow All Interfaces"
														}))
														return
													}

													// clear marking if newVal.length > 0
													if (newVal.length > 0) {
														$$("smbConfigForm").markInvalid("bind_interfaces", false)
													}
												}
											}, invalidMessage: "Cannot be empty"
										},
										{
											view: "switch", id: "smbConfigUseSendfile", label: "Use Sendfile", labelWidth: labelWidth,
										},
										{
											view: "switch", id: "smbConfigUnixExtensions", label: "Unix Extensions", labelWidth: labelWidth,
										},
										{
											view: "switch", id: "smbConfigStoreDosAttributes", label: "Store DOS attributes", labelWidth: labelWidth,
										},
										{
											view: "switch", id: "smbSMB2Leases", label: "SMB2 Leases", labelWidth: labelWidth,
										},
										{
											view: "richselect", id: "smbConfigLogLevel", name: "log_level", label: "Log Level", labelWidth: labelWidth, options: [
												{ id: -1, value: "0" },
												{ id: 1, value: "1" },
												{ id: 2, value: "2" },
												{ id: 3, value: "3" },
												{ id: 4, value: "4" },
												{ id: 5, value: "5" },
												{ id: 6, value: "6" },
												{ id: 7, value: "7" },
												{ id: 8, value: "8" },
												{ id: 9, value: "9" },
												{ id: 10, value: "10" },
											], invalidMessage: "Cannot be empty"
										},
										{
											cols: [
												{
													view: "text", label: "Max Log Size", labelWidth: labelWidth, name: "max_log_size", id: "smbConfigMaxLogSize", invalidMessage: "Cannot be empty", on: {
														onKeyPress: function (code, e) {
															// Allow only numbers, backspace, tab, delete, left and right arrows
															if (code < 48 || code > 57) {
																if (code != 8 && code != 9 && code != 46 && code != 37 && code != 39) {
																	return false;
																}
															}
															return true;
														}
													}
												},
												{
													view: "richselect", label: "", options: ["MiB", "GiB"], width: 70, id: "smbConfigMaxLogSizeUnit"
												}
											]
										},
										{
											view: "textarea", id: "smbConfigVetoFiles", label: "Default Veto Files", labelWidth: labelWidth, height: 150
										},
										{ height: 10 },
										{
											view: "button", value: "Apply", css: "new_style_primary", width: 70, click: function () {
												if ($$("smbConfigForm").validate()) {
													var json_config = {
														"workgroup": $$("smbConfigWorkgroup").getValue(),
														"bind_interfaces_only": $$("smbConfigBindInterfaces").getValue() == "Allow All Interfaces" ? "n" : "y",
														"interfaces": $$("smbConfigBindInterfaces").getValue() == "Allow All Interfaces" ? "" : $$("smbConfigBindInterfaces").getValue(),
														"use_sendfile": $$("smbConfigUseSendfile").getValue() == 1 ? "y" : "n",
														"unix_extensions": $$("smbConfigUnixExtensions").getValue() == 1 ? "y" : "n",
														"store_dos_attributes": $$("smbConfigStoreDosAttributes").getValue() == 1 ? "y" : "n",
														"smb2_leases": $$("smbSMB2Leases").getValue() == 1 ? "y" : "n",
														"log_level": $$("smbConfigLogLevel").getValue() * 1 == -1 ? 0 : $$("smbConfigLogLevel").getValue() * 1,
														"max_log_size": $$("smbConfigMaxLogSizeUnit").getValue() == "MiB" ? $$("smbConfigMaxLogSize").getValue() * 1000 : $$("smbConfigMaxLogSize").getValue() * 1000 * 1000,
														"veto_files": $$("smbConfigVetoFiles").getValue()
													}

													webix.ajax().put("/api/smb/config", JSON.stringify(json_config)).then(function (data) {

														if ($$("smbConfigEnable").getValue() == 1) {
															webix.ajax().put("/api/smb/service/start")
														} else {
															webix.ajax().put("/api/smb/service/stop")
														}
														webix.message({ type: "success", text: data.json(), expire: 2000 })
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
												}
											}
										},
									]
								},
								{}
							]
						},
					],
					rules: {
						workgroup: webix.rules.isNotEmpty,
						max_log_size: webix.rules.isNotEmpty,
						log_level: webix.rules.isNotEmpty,
						bind_interfaces: function (value) {
							return value.length > 0
						}
					}
				}
			]
		}
	}
	init() {
		webix.ajax().get("/api/network/dns").then((data) => {
			var managementInterfaceData = data.json()
			// add "Allow All Interfaces" to the beginning of the list of interfaces

			managementInterfaceData.interfaces.unshift("Allow All Interfaces")

			// all available interfaces
			$$("smbConfigBindInterfaces").define("options", managementInterfaceData.interfaces)
		})

		webix.ajax().get("/api/smb/config").then(function (data) {
			var config = data.json()

			$$("smbConfigWorkgroup").setValue(config.workgroup)
			$$("smbConfigBindInterfaces").setValue(config.bind_interfaces_only == "n" ? ["Allow All Interfaces"] : config.interfaces.split(","))
			$$("smbConfigUseSendfile").setValue(config.use_sendfile == "y" ? 1 : 0)
			$$("smbConfigUnixExtensions").setValue(config.unix_extensions == "y" ? 1 : 0)
			$$("smbConfigStoreDosAttributes").setValue(config.store_dos_attributes == "y" ? 1 : 0)
			$$("smbConfigLogLevel").setValue(config.log_level == "0" ? -1 : config.log_level)
			$$("smbConfigMaxLogSize").setValue(config.max_log_size / 1000 >= 1000 ? config.max_log_size / 1000 / 1000 : config.max_log_size / 1000)
			$$("smbConfigMaxLogSizeUnit").setValue(config.max_log_size / 1000 >= 1000 ? "GiB" : "MiB")
			$$("smbConfigVetoFiles").setValue(config.veto_files)
			$$("smbSmb2Leases").setValue(config.smb2_leases == "y" ? 1 : 0)
		})

		webix.ajax().get("/api/smb/service").then(function (data) {
			var enabled = data.json()
			$$("smbConfigEnable").setValue(enabled ? 1 : 0)
		})
	}
}