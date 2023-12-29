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
import { JetView, plugins } from "webix-jet";

import { ajaxFail } from "../functions/ajaxFail";
import { netmaskConverter } from "../functions/netmaskConverter";
import { ipAddressValidator, ipAddressStringValidator } from "../functions/IPAddressValidation";

var previous_interface_gateway, previous_interface
export default class LoginPage extends JetView {
	config() {
		const labelWidth = 300
		const self = this

		var portalLoginForm = {
			borderless: true,
			view: "form",
			id: "portalLoginForm",
			elements: [
				{
					borderless: true,
					rows: [
						{},
						{
							cols: [
								{},
								{
									rows: [
										{ view: "label", label: "Sign In", align: "center", css: "loginLabel" },
										{
											view: "text", id: "loginUsername", icon: "mdi mdi-account-outline", placeholder: "Username", name: "username", invalidMessage: "Username is required", height: 35, width: 250,
										},
										{
											view: "text", id: "loginPassword", icon: "mdi mdi-lock-outline", type: "password", placeholder: "Password", name: "password", invalidMessage: "Password is required", height: 35, width: 250,
										},
										{
											height: 5
										},
										{
											cols: [
												{},
												{
													view: "button", value: "Login", css: "new_style_primary", type: "form", height: 30, width: 70, click: () => {
														var values = $$("portalLoginForm").getValues();
														webix.ajax().post("/api/login", JSON.stringify(values)).then((data) => {
															if (data.json().access_token) {
																webix.storage.cookie.put("access_token", data.json().access_token)
																webix.storage.cookie.put("refresh_token", data.json().refresh_token)
																this.app.show("/top/dashboard");
															}
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
													}
												},
												{}
											]
										}
									]
								},
								{}
							]
						},
						{}
					]
				},
			],
			rules: {
				username: webix.rules.isNotEmpty,
				password: webix.rules.isNotEmpty
			}
		}

		var s3browserForm = {
			borderless: true,
			view: "form",
			id: "s3browserForm",
			elements: [
				{
					borderless: true,
					rows: [
						{},
						{
							cols: [
								{},
								{
									rows: [
										{ view: "label", label: "Sign In", align: "center", css: "loginLabel" },
										{
											view: "text", icon: "mdi mdi-web", placeholder: "S3-Compatible Service Endpoint", name: "url", invalidMessage: "Endpoint is required", height: 35, width: 350, format: {
												parse: function (value) {
													return value
												},
												edit: function (value) {
													if (value != "") {
														// check if value starts with http://
														if (value.startsWith("http://")) {
															// remove http:// prefix
															value = value.replace("http://", "")
															// remove all characters except digits, dots and colons
															value = value.replace(/[^0-9.:]/g, "")
															// add http:// prefix
															value = "http://" + value
														} else if (value.startsWith("https://")) {
															// remove https:// prefix
															value = value.replace("https://", "")
															// remove all characters except digits, dots and colons
															value = value.replace(/[^0-9.:]/g, "")
															// add https:// prefix
															value = "https://" + value
														} else {
															// remove all colons except the last one
															value = value.replace(/:(?=.*:)/g, "")
															// remove all characters except digits and dots
															value = value.replace(/[^0-9.:]/g, "")
															// add http:// prefix
															value = "http://" + value
														}
														return value
													} else return value
												},
											}
										},
										{
											view: "text", icon: "mdi mdi-lock-outline", placeholder: "Access Key", name: "access_key", invalidMessage: "Access Key is required", height: 35, width: 350
										},
										{
											view: "text", icon: "mdi mdi-lock-outline", placeholder: "Access Secret Key", name: "access_secret", invalidMessage: "Access Secret Key is required", height: 35, width: 350
										},
										{
											height: 5
										},
										{
											cols: [
												{},
												{
													view: "button", value: "Login", css: "new_style_primary", type: "form", height: 30, width: 70, click: () => {
														var values = $$("s3browserForm").getValues();
														// if error, show error message
														// if success, save session and show s3browser
														webix.ajax().post("/api/s3browser/session", JSON.stringify(values)).then((data) => {
															if (data.json()) {
																webix.storage.session.put("s3browser_session", data.json())
																this.app.show("/s3browser");
															}
														}).fail((xhr) => {
															ajaxFail(xhr)
															webix.storage.session.remove("s3browser_session")
														})
													}
												},
												{}
											]
										}
									]
								},
								{}
							]
						},
						{}
					]
				},
			],
			rules: {
			}
		}

		var tabs = {
			cells: [
				portalLoginForm,
				s3browserForm
			]
		}

		return {
			borderless: true,
			type: "wide",
			rows: [
				{
					view: "toolbar",
					css: "webix_dark",
					elements: [
						{
							paddingX: 7,
							paddingY: 7,
							rows: [
								{
									cols: [
										{
											view: "label", label: "Infinistor Hydra", css: "header_label"
										},
										{},
									]
								}
							]
						},
						{ width: 6 }
					]
				},
				{
					id: "loginLayout",
					rows: [
						{},
						{
							cols: [
								{},
								{
									view: "tabbar",
									borderless: true,
									optionWidth: 100,
									minWidth: 272,
									multiview: true,
									options: [
										{ id: "portalLoginForm", value: "Portal" },
										{ id: "s3browserForm", value: "S3 Browser" },
									],
								},
								{}
							]
						},
						{
							cols: [
								{},
								tabs,
								{}
							]
						},
						{}
					]
				},
				{
					id: "managementLayout",
					hidden: true,
					rows: [
						{},
						{
							cols: [
								{},
								{
									view: "form",
									elements: [
										{
											cols: [
												{
													width: 600,
													rows: [
														{ view: "label", label: "Set a management interface", align: "center", css: "loginLabel" },
														{ height: 10 },
														{
															view: "richselect", id: "managementInterfaceList", label: "Interface", labelWidth: labelWidth, options: [], on: {
																onChange: (newVal, oldVal) => {
																	webix.ajax().get("/api/network/interfaces/").then((data) => {
																		var interfacesData = data.json()

																		// find the interface that is selected and save its data to temp
																		var chosenInterface = interfacesData.find(item => item.name === newVal) || {};

																		$$("managementIp").setValue(chosenInterface.ip)
																		$$("managementNetmaskCounter").setValue(chosenInterface.netmask)
																		$$("managementNetmask").setValue(netmaskConverter(chosenInterface.netmask))
																		$$("managementGateway").setValue(chosenInterface.gateway)
																	})
																}
															}
														},
														{
															view: "text", id: "managementIp", label: "IP Address", labelWidth: labelWidth,
														},
														{
															cols: [
																{
																	view: "counter", id: "managementNetmaskCounter", label: "Prefix / Netmask",
																	min: 0, max: 32, step: 1, labelWidth: labelWidth, width: labelWidth + 120,
																	on: {
																		onChange: (newv, oldv) => {
																			$$("managementNetmask").setValue(netmaskConverter(newv))
																		}
																	}
																},
																{
																	view: "text", id: "managementNetmask", readonly: true,
																}
															]
														},
														{
															view: "text", id: "managementGateway", label: "Gateway", labelWidth: labelWidth,
														},
														{ view: "label", label: "DNS (Domain Name System)" },
														{
															padding: {
																left: 17, bottom: 0, top: 0, right: 0
															},
															rows: [
																{
																	view: "text", id: "managementDns1", label: "DNS1", value: "", labelWidth: labelWidth - 17
																},
																{
																	view: "text", id: "managementDns2", label: "DNS2", value: "", labelWidth: labelWidth - 17
																},
															]
														},
														{ height: 10 },
														{
															view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
																if (ipAddressValidator($$("managementIp").getValue()) == false) return webix.message({
																	type: "error",
																	text: "Invalid IP Address"
																})

																var gateway = $$("managementGateway").getValue() == "N/A" ? "" : $$("managementGateway").getValue()
																if (ipAddressStringValidator(gateway) == false) return webix.message({
																	type: "error",
																	text: "Invalid Gateway"
																})

																var target_interface = $$("managementInterfaceList").getValue()
																var json = {
																	"dhcp": "NO",
																	"ip": $$("managementIp").getValue() != "N/A" ? $$("managementIp").getValue() : "",
																	"netmask": $$("managementNetmask").getValue() != "N/A" ? $$("managementNetmaskCounter").getValue() + "" : "",
																	"gateway": gateway,
																}

																webix.ajax().put("/api/network/interfaces/" + target_interface, JSON.stringify(json)).then((data) => {
																	if (data.json() != "Updated network successfully") return webix.message({
																		type: "error",
																		text: "Failed to update network"
																	})

																	var dns_list = []
																	dns_list.push($$("managementDns1").getValue())
																	dns_list.push($$("managementDns2").getValue())

																	var json_management = {
																		"dns_list": dns_list,
																		"target_interface": target_interface,
																	}

																	previous_interface != $$("managementInterfaceList").getText() ? json_management["previous_interface"] = previous_interface : ""
																	previous_interface_gateway != "N/A" || "" ? json_management["previous_interface_gateway"] = previous_interface_gateway : ""

																	webix.ajax().put("/api/network/management-interface", JSON.stringify(json_management)).then((data) => {
																		webix.message({ type: "success", text: "Management interface settings saved", expire: 10000 })
																		webix.delay(() => self.app.show("/top/dashboard"));
																	}).fail((xhr) => {
																		ajaxFail(xhr)
																	})
																}).fail((xhr) => {
																	ajaxFail(xhr)
																})
															}
														},
													]
												},
												{}
											]
										},
									]
								},
								{}
							]
						},
						{}
					]
				},
			]
		};
	}
	init() {
		var _self = this
		$$("loginUsername").attachEvent("onKeyPress", function (code, e) {
			if (code === 13) {
				_self.login(_self, $$("portalLoginForm").getValues())
			}
		});
		$$("loginPassword").attachEvent("onKeyPress", function (code, e) {
			if (code === 13) {
				_self.login(_self, $$("portalLoginForm").getValues())
			}
		});
	}
	login(self, values) {
		// check if username and password is not empty
		if (values.username === "" || values.password === "") {
			webix.message({ type: "error", text: "Login ID or password is incorrect" })
			return
		}

		webix.ajax().post("/api/login", JSON.stringify(values)).then(function (data) {
			if (data.json().access_token) {
				webix.storage.cookie.put("access_token", data.json().access_token)
				webix.storage.cookie.put("refresh_token", data.json().refresh_token)
				var management_network_exists = data.json().management_network_exists
				if (management_network_exists == "true") {
					if (webix.storage.cookie.getRaw('access_token')) {
						webix.delay(() => self.app.show("/top/dashboard"));
					}
				} else if (management_network_exists == "false") {
					webix.ajax().get("/api/network/dns").then((data) => {
						var managementInterfaceData = data.json()

						for (var i = 0; i < managementInterfaceData.dns_list.length; i++) {
							if (i == 0) {
								$$("managementDns1").setValue(managementInterfaceData.dns_list[i])
							} else if (i == 1) {
								$$("managementDns2").setValue(managementInterfaceData.dns_list[i])
							} else break;
						}

						// all available interfaces
						$$("managementInterfaceList").define("options", managementInterfaceData.interfaces)
						// management interface
						$$("managementInterfaceList").setValue(managementInterfaceData.management_interface)
						previous_interface = managementInterfaceData.management_interface
						// management interface ip
						$$("managementIp").setValue(managementInterfaceData.ip_address)
						// management interface netmask
						$$("managementNetmaskCounter").setValue(managementInterfaceData.netmask)
						var netmask = netmaskConverter(managementInterfaceData.netmask)
						$$("managementNetmask").setValue(netmask)
						// management interface gateway
						$$("managementGateway").setValue(managementInterfaceData.gateway)
						previous_interface_gateway = managementInterfaceData.gateway

						$$("loginLayout").hide()
						$$("managementLayout").show()
					}).fail((xhr) => {
						ajaxFail(xhr)
					})
				}
			}
		}).fail((xhr) => {
			ajaxFail(xhr)
		})
	}
}