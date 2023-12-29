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

import { netmaskConverter } from "./../../../../functions/netmaskConverter";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 500;
export default class EditWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var previous_interface = ""
		var previous_interface_gateway = ""
		var taken_ips = []

		function checkIfIpIsTaken(ip) {
			if (taken_ips.includes(ip)) return true
			else return false
		}

		return {
			view: "window",
			id: "network_interface_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Network Interface Edit", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "network_interface_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", id: "interfaceNameText", label: "Interface", readonly: true, labelWidth: labelWidth
									},
									{
										view: "text", id: "interfaceTypeText", label: "Type", readonly: true, labelWidth: labelWidth
									},
									{
										view: "text", id: "macText", label: "MAC", readonly: true, labelWidth: labelWidth
									},
									{
										view: "switch", id: "dhcpSwitch", label: "DHCP", labelWidth: labelWidth, value: 1, on: {
											onChange: (newv, oldv) => {
												$$("network_interface_form").validate()

												$$("ipAddressText").define("disabled", newv)
												$$("gatewayText").define("disabled", newv)
												if (newv == 0) {
													$$("netmaskCounter").enable()
													$$("netmaskText").enable()
												} else {
													$$("netmaskCounter").disable()
													$$("netmaskText").disable()
												}
												$$("ipAddressText").refresh()
												$$("gatewayText").refresh()
												$$("netmaskCounter").refresh()
											}
										}
									},
									{
										view: "text", id: "ipAddressText", label: "IP Address", disabled: true,
										labelWidth: labelWidth, on: {
											onKeyPress: (code, event) => {
												// 8: backspace, 9: tab, 13: enter, 27: esc, 35: end, 37: left, 39: right, 46: delete, 48-57: 0-9, 190: .
												var allowedChars = [8, 9, 13, 27, 35, 37, 39, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 190]
												if (allowedChars.includes(code)) return true
												else return false
											},
											onChange: (newv, oldv) => {
												if (checkIfIpIsTaken(newv)) {
													$$("network_interface_form").markInvalid("ipAddress", "IP address already taken")
												} else {
													$$("network_interface_form").markInvalid("ipAddress", false)
												}
											}
										}, name: "ipAddress", invalidMessage: "Invalid IP address"
									},
									{
										cols: [
											{
												view: "counter", id: "netmaskCounter", label: "Prefix / Netmask", disabled: true, value: 24,
												min: 0, max: 32, step: 1, labelWidth: labelWidth, width: labelWidth + 120,
												on: {
													onChange: (newv, oldv) => {
														$$("netmaskText").setValue(netmaskConverter(newv))
													}
												}
											},
											{
												view: "text", id: "netmaskText", readonly: true, disabled: true,
											}
										]
									},
									{
										view: "text", id: "gatewayText", label: "Gateway", disabled: true, labelWidth: labelWidth,
										name: "gateway", invalidMessage: "Invalid: Must be a valid IP address or empty"
									},
									{
										view: "switch", id: "management", label: "System Management Interface", labelWidth: labelWidth, on: {
											onChange: (newv, oldv) => {
												// check if dhcp value is 1 -> return false
												if ($$("dhcpSwitch").getValue() == 1 && newv == 1) {
													$$("management").setValue(0)
													// message
													webix.message({
														type: "error",
														text: "DHCP must be disabled for the system management interface"
													})
													return false
												}

												if (newv == 1) {
													$$("dns1").show()
													$$("dns2").show()
												} else {
													$$("dns1").hide()
													$$("dns2").hide()
												}
											}
										}
									},
									{
										view: "text", id: "dns1", label: "DNS 1", labelWidth: labelWidth, hidden: true,
									},
									{
										view: "text", id: "dns2", label: "DNS 2", labelWidth: labelWidth, hidden: true,
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// if all fields are valid, then update the interface
													if ($$("network_interface_form").validate()) {
														var dhcp = $$("dhcpSwitch").getValue()
														var ip = ""
														var netmask = ""
														var gateway = ""
														if (dhcp === 0) {
															dhcp = "NO"
															ip = $$("ipAddressText").getValue()
															netmask = $$("netmaskCounter").getValue()
															gateway = $$("gatewayText").getValue()
														} else {
															dhcp = "YES"
														}

														var json_put = {
															"dhcp": dhcp,
															"ip": ip,
															"netmask": netmask.toString(),
															"gateway": gateway == "none" ? "" : gateway
														}

														var interface_name = $$("interfaceNameText").getValue()

														webix.ajax().put("/api/network/interfaces/" + interface_name, JSON.stringify(json_put)).then((data) => {
															// if system management interface is enabled, then update system management interface
															if ($$("management").getValue() === 1) {
																var dns1 = $$("dns1").getValue()
																var dns2 = $$("dns2").getValue()

																var json_put = {
																	"dns_list": [dns1, dns2],
																	"target_interface": interface_name
																}

																if (previous_interface != interface_name && previous_interface != "") {
																	json_put["previous_interface"] = previous_interface
																}

																if (previous_interface_gateway != gateway && previous_interface_gateway != "") {
																	json_put["previous_interface_gateway"] = previous_interface_gateway
																}

																webix.ajax().put("/api/network/management-interface", JSON.stringify(json_put)).then((data) => {
																	// reload network interfaces datatable
																	$$("physical_interface_table").clearAll()
																	$$("physical_interface_table").load("/api/network/interfaces")
																	this.hideWindow()

																	webix.message({ type: "success", text: "Interface modified", expire: 10000 })
																}).fail((xhr) => {
																	ajaxFail(xhr)
																})
															} else {
																// reload network interfaces datatable
																$$("physical_interface_table").clearAll()
																$$("physical_interface_table").load("/api/network/interfaces")
																this.hideWindow()
															}
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
													}
												}
											},
											{
												view: "button", value: "Cancel", css: "new_style_button", width: 70, click: () => {
													this.hideWindow()
												}
											},
										]
									},
								]
							},
							{}
						]
					},
				],
				rules: {
					ipAddress: function (value) {
						// if dhcp is enabled, then ip address is not required
						var dhcp = $$("dhcpSwitch").getValue()
						if (dhcp == 1) return true
						// if dhcp is disabled, then ip address is required
						var parts = value.split(".")
						if (parts.length != 4) return false
						for (let i = 0; i < parts.length; i++) {
							if (parts[i] < 0 || parts[i] > 254) return false
						}

						// check if ip address is already in use --> check if in taken_ips
						if (checkIfIpIsTaken(value)) {
							return false
						}

						return true
					},
					gateway: function (value) {
						// if dhcp is enabled, then gateway is not required
						var dhcp = $$("dhcpSwitch").getValue()
						if (dhcp == 1) return true
						// if dhcp is disabled, then gateway is required
						if (value == "") return true
						var parts = value.split(".")
						if (parts.length != 4) return false
						for (let i = 0; i < parts.length; i++) {
							if (parts[i] < 0 || parts[i] > 254) return false
						}
						return true
					},
				}
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			},
			on: {
				onShow: () => {
					previous_interface = ""
					previous_interface_gateway = ""

					var interface_name = this.getParam("interface", true)

					webix.ajax().get("/api/network/interfaces").then((data) => {
						var interfaces = data.json()

						taken_ips = interfaces.map((interface_dev) => {
							if (interface_dev.ip != "N/A" && interface_dev.name != interface_name) {
								return interface_dev.ip
							}
						})

						webix.ajax().get("/api/network/interfaces/" + interface_name).then((data) => {
							var interfaceNetwork = data.json()
							webix.ajax().get("/api/network/dns").then((data) => {
								var dns = data.json()

								$$("dns1").setValue(dns.dns_list[0])
								$$("dns2").setValue(dns.dns_list[1])

								previous_interface = dns.management_interface
								dns.gateway == "N/A" ? previous_interface_gateway = "" : previous_interface_gateway = dns.gateway

								if (interfaceNetwork.dhcp === "YES") {
									$$("dhcpSwitch").setValue(1)

									$$("ipAddressText").define("disabled", true)
									$$("netmaskCounter").disable()
									$$("netmaskText").disable()
									$$("gatewayText").define("disabled", true)
								} else if (interfaceNetwork.dhcp === "NO") {
									$$("dhcpSwitch").setValue(0)

									if (interfaceNetwork.ip !== "N/A") {
										$$("ipAddressText").setValue(interfaceNetwork.ip)
									}
									$$("ipAddressText").define("disabled", false)

									$$("netmaskCounter").setValue(interfaceNetwork.netmask)
									$$("netmaskCounter").enable()
									$$("netmaskText").enable()
									$$("netmaskText").setValue(netmaskConverter(interfaceNetwork.netmask))

									if (interfaceNetwork.gateway !== "N/A") {
										$$("gatewayText").setValue(interfaceNetwork.gateway)
									}
									$$("gatewayText").define("disabled", false)
								} else {
									$$("dhcpSwitch").setValue(1)

									$$("ipAddressText").define("disabled", true)
									$$("ipAddressText").setValue("")
									$$("netmaskCounter").disable()
									$$("netmaskCounter").setValue(24)
									$$("netmaskText").disable()
									$$("netmaskText").setValue("255.255.255.0")
									$$("gatewayText").define("disabled", true)
									$$("gatewayText").setValue("none")
								}

								$$("macText").setValue(interfaceNetwork.mac)
								$$("interfaceNameText").setValue(interfaceNetwork.name)
								if (interfaceNetwork.type2 !== "") {
									$$("interfaceTypeText").setValue(interfaceNetwork.type1 + ", " + interfaceNetwork.type2)
									if (interfaceNetwork.type2.indexOf("Management") > -1) {
										$$("management").setValue(1)
										// disable management
										$$("management").define("readonly", true)

									} else {
										$$("management").setValue(0)
										$$("management").define("readonly", false)
									}
								} else {
									$$("interfaceTypeText").setValue(interfaceNetwork.type1)
									$$("management").setValue(0)
									$$("management").define("readonly", false)
								}
							})
						})
					})
				},
				onHide: () => {
					$$("network_interface_form").clear()
					$$("network_interface_form").clearValidation()
					$$("dhcpSwitch").setValue(0)
					$$("management").setValue(0)
				}
			}
		}
	}
	ready() {
		var networkWindow = $$("network_interface_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkWindow.isVisible())
				networkWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}