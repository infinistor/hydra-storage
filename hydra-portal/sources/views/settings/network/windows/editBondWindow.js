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

import { netmaskConverter } from "../../../../functions/netmaskConverter";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 600;
export default class EditBONDWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		return {
			view: "window",
			id: "network_interface_edit_bond_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Edit Bond Interface", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "edit_bond_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "label", label: "Slave Interfaces"
									},
									{
										padding: 0,
										rows: [
											{
												view: "datatable",
												headerRowHeight: 24,
												autoheight: true,
												id: "editBond_slaveInterfaces",
												borderless: true,
												scroll: "y",
												columns: [
													{ id: "name", header: "Name", adjust: true },
													{ id: "ip", header: "IP", fillspace: true },
													{
														id: "type", header: "Type", adjust: true, template: (obj) => {
															var value = obj.type1
															if (obj.type2 !== "") {
																value += ", " + obj.type2
															}
															return value
														}
													},
													{ id: "speed", header: "Speed", adjust: true },
													{
														id: "status", header: "Status", adjust: true, template: (obj) => {
															if (obj.status === "Active")
																return "<span style='color: #00c900;'>" + obj.status + "</span>"
															else if (obj.status === "Inactive")
																return "<span style='color: red;'>" + obj.status + "</span>"
															else return obj.status
														}
													},
												],
												data: [],
											}
										]
									},
									{ height: 20 },
									{
										view: "text", id: "editBond_interfaceText", label: "Interface", labelWidth: labelWidth, name: "interface", readonly: true,
									},
									{
										view: "text", label: "Type", value: "Bond", labelWidth: labelWidth, readonly: true,
									},
									{ height: 20 },
									{
										view: "label", label: "Bonding Options"
									},
									{
										padding: {
											left: 17, bottom: 0, top: 0, right: 0
										},
										rows: [
											{
												view: "text", id: "editBond_type", label: "Type", labelWidth: labelWidth - 17, readonly: true,
											},
											{
												view: "text", id: "editBond_primaryInterface", label: "Primary Interface", labelWidth: labelWidth - 17, readonly: true,
											},
											{
												view: "text", id: "editBond_primaryReselectPolicy", label: "Primary Reselect Policy", labelWidth: labelWidth - 17, readonly: true,
											},
										]
									},
									{ height: 20 },
									{
										view: "switch", id: "editBond_dhcpSwitch", label: "DHCP", labelWidth: labelWidth, value: 0, on: {
											onChange: (newv, oldv) => {
												$$("edit_bond_form").validate()

												$$("editBond_ipAddressText").define("disabled", newv)
												$$("editBond_gatewayText").define("disabled", newv)
												if (newv == 0) {
													$$("editBond_netmaskCounter").enable()
													$$("editBond_netmaskText").enable()
												} else {
													$$("editBond_netmaskCounter").disable()
													$$("editBond_netmaskText").disable()
												}
												$$("editBond_ipAddressText").refresh()
												$$("editBond_gatewayText").refresh()
												$$("editBond_netmaskCounter").refresh()
											}
										}
									},
									{
										view: "text", id: "editBond_ipAddressText", name: "ipAddress", label: "IP Address", labelWidth: labelWidth, on: {
											onKeyPress: (code, event) => {
												// 8: backspace, 9: tab, 13: enter, 27: esc, 35: end, 37: left, 39: right, 46: delete, 48-57: 0-9, 190: .
												var allowedChars = [8, 9, 13, 27, 35, 37, 39, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 190]
												if (allowedChars.includes(code)) return true
												else return false
											},
										},
										invalidMessage: "Invalid IP address"
									},
									{
										cols: [
											{
												view: "counter", id: "editBond_netmaskCounter", label: "Prefix / Netmask", value: 24,
												min: 0, max: 32, step: 1, labelWidth: labelWidth, width: labelWidth + 120,
												on: {
													onChange: (newv, oldv) => {
														$$("editBond_netmaskText").setValue(netmaskConverter(newv))
													}
												}
											},
											{
												view: "text", id: "editBond_netmaskText", readonly: true, on: {
													onBeforeRender: () => {
														var prefix = $$("editBond_netmaskCounter").getValue()
														$$("editBond_netmaskText").setValue(netmaskConverter(prefix))
													}
												}
											}
										]
									},
									{
										view: "text", id: "editBond_gatewayText", label: "Gateway", value: "none", labelWidth: labelWidth, name: "gateway",
										invalidMessage: "Invalid: Must be a valid IP address or 'none'"
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// if all fields are valid, then add the VLAN
													if ($$("edit_bond_form").validate()) {
														// initialize variables
														var dhcp = $$("editBond_dhcpSwitch").getValue()
														var ip = ""
														var netmask = ""
														var gateway = ""
														var interface_name = $$("editBond_interfaceText").getValue()

														// set variables based on dhcp switch
														if (dhcp === 0) {
															dhcp = "NO"
															ip = $$("editBond_ipAddressText").getValue()
															netmask = $$("editBond_netmaskCounter").getValue()
															gateway = $$("editBond_gatewayText").getValue()
														} else {
															dhcp = "YES"
														}

														// create json object
														var json_bond = {
															"dhcp": dhcp,
															"ip": ip,
															"netmask": netmask.toString(),
															"gateway": gateway == "none" ? "" : gateway,
														}

														webix.ajax().put("/api/network/interfaces/" + interface_name, JSON.stringify(json_bond)).then(() => {
															// refresh the network interface table
															$$("physical_interface_table").clearAll()
															$$("physical_interface_table").load("/api/network/interfaces")
															// hide the window
															webix.message({ type: "success", text: "Bond interface modified", expire: 10000 })
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
					"interface": webix.rules.isNotEmpty,
					"ipAddress": (value) => {
						// if dhcp is enabled, then ip address is not required
						var dhcp = $$("editBond_dhcpSwitch").getValue()
						if (dhcp == 1) return true
						// if dhcp is disabled, then ip address is required
						var parts = value.split(".")
						if (parts.length != 4) return false
						for (let i = 0; i < parts.length; i++) {
							if (parts[i] < 0 || parts[i] > 254) return false
						}
						return true
					}
				}
			},
			on: {
				onShow: () => {
					var interface_name = this.getParam("interface", true)
					webix.ajax().get("/api/network/interfaces").then((response) => {
						$$("editBond_slaveInterfaces").clearAll()
						var data = []
						var interfaces = response.json()
						for (var i = 0; i < interfaces.length; i++) {
							var interfaceData = interfaces[i]
							if (interfaceData.slaveof === interface_name) {
								data.push(interfaces[i])
							}
						}
						$$("editBond_slaveInterfaces").parse(data)
					})

					webix.ajax().get("/api/network/interfaces/" + interface_name).then((response) => {
						var data = response.json()
						var bond_options = data.bondoptions.split(",")
						for (var i = 0; i < bond_options.length; i++) {
							if (i == 0) {
								var type = bond_options[i].split("=")[1]
								if (type === "active-backup") {
									$$("editBond_type").setValue("1 - active-backup")
									$$("editBond_primaryInterface").show()
									$$("editBond_primaryReselectPolicy").show()
								} else if (type === "balance-rr") {
									$$("editBond_type").setValue("2 - balance-rr")
									$$("editBond_primaryInterface").hide()
									$$("editBond_primaryReselectPolicy").hide()
								} else if (type === "balance-xor") {
									$$("editBond_type").setValue("3 - balance-xor")
									$$("editBond_primaryInterface").hide()
									$$("editBond_primaryReselectPolicy").hide()
								} else if (type === "broadcast") {
									$$("editBond_type").setValue("4 - broadcast")
									$$("editBond_primaryInterface").hide()
									$$("editBond_primaryReselectPolicy").hide()
								} else if (type === "802.3ad") {
									$$("editBond_type").setValue("5 - 802.3ad")
									$$("editBond_primaryInterface").hide()
									$$("editBond_primaryReselectPolicy").hide()
								} else if (type === "balance-alb") {
									$$("editBond_type").setValue("6 - balance-alb")
									$$("editBond_primaryInterface").show()
									$$("editBond_primaryReselectPolicy").show()
								}
							} else if (i == 1) {
								$$("editBond_primaryInterface").setValue(bond_options[i].split("=")[1])
							} else if (i == 2) {
								$$("editBond_primaryReselectPolicy").setValue(bond_options[i].split("=")[1])
							}
						}
						$$("editBond_interfaceText").setValue(data.name)
						$$("editBond_dhcpSwitch").setValue(data.dhcp === "YES" ? 1 : 0)
						$$("editBond_ipAddressText").setValue(data.ip)
						$$("editBond_netmaskCounter").setValue(data.netmask)
						$$("editBond_gatewayText").setValue(data.gateway === "N/A" ? "none" : data.gateway)
					})
				},
				onHide: () => {
					$$("edit_bond_form").clear()
					$$("edit_bond_form").clearValidation()
				}
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			}
		}
	}
	ready() {
		var networkEditBONDWindow = $$("network_interface_edit_bond_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkEditBONDWindow.isVisible())
				networkEditBONDWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}