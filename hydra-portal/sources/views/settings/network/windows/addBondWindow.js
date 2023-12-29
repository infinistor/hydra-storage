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

import { isKeyValidLatinOrNumber } from "../../../../functions/validation";
import { netmaskConverter } from "../../../../functions/netmaskConverter";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 600;
export default class AddBONDWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var interfaceNameAvailable = false

		// variables needed for validation
		const specialChars = ["-", "_"];

		function isInterfaceNameAvailable(value) {
			if (value === "") {
				interfaceNameAvailable = false
			} else {
				webix.ajax().get("/api/network/interface-name-taken/" + value).then((data) => {
					var interfaceNameTaken = data.json()
					if (interfaceNameTaken) {
						$$("add_bond_form").markInvalid("interface", "Interface name is already taken")
						interfaceNameAvailable = false
					} else {
						$$("add_bond_form").markInvalid("interface", false)
						interfaceNameAvailable = true
					}
				})
			}
		}

		return {
			view: "window",
			id: "network_interface_add_bond_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add Bond Interface", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_bond_form",
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
												id: "addBond_slaveInterfaces",
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
														id: "select", header: "", template: (obj) => {
															obj.checked = false
															if (obj.type2 === "Management")
																return "<input disabled class='webix_table_checkbox' type='checkbox'>"
															else return "<input class='webix_table_checkbox' type='checkbox'>"
														}, width: 60, css: "checkboxCenter"
													},
												],
												data: [],
												on: {
													onCheck: (row, column, state) => {
														var data = $$("addBond_slaveInterfaces").getItem(row)
														if (state) {
															var slaves = $$("addBond_primaryInterface").getList().data.order
															if (slaves.length === 0) {
																$$("addBond_primaryInterface").getList().add({ id: data.name, value: data.name })
																$$("addBond_primaryInterface").setValue(data.name)
															} else {
																if (!slaves.includes(data.name)) {
																	$$("addBond_primaryInterface").getList().add({ id: data.name, value: data.name })
																}
															}
														} else {
															$$("addBond_primaryInterface").getList().remove(data.name)
															if ($$("addBond_primaryInterface").getValue() === data.name) {
																$$("addBond_primaryInterface").setValue("")
															}
														}
													}
												}
											}
										]
									},
									{ height: 20 },
									{
										view: "text", id: "addBond_interfaceText", label: "Interface", labelWidth: labelWidth, name: "interface", invalidMessage: "Cannot be empty",
										on: {
											onKeyPress: (code, event) => {
												return isKeyValidLatinOrNumber(code, event) || code === 45 || code === 95
											},
											onChange: (newv, oldv) => {
												if (newv !== "") {
													if (!isNaN(newv[0]) || specialChars.includes(newv[0])) {
														$$("add_bond_form").markInvalid("interface", "Interface name must start with a letter")
														interfaceNameAvailable = false
													} else {
														isInterfaceNameAvailable(newv)
													}
												} else {
													$$("add_bond_form").markInvalid("interface", "Cannot be empty")
												}
											}
										}
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
												view: "richselect", id: "addBond_type", label: "Type", labelWidth: labelWidth - 17, options: [
													"0 - balance-rr",
													"1 - active-backup",
													"2 - balance-xor",
													"3 - broadcast",
													"4 - 802.3ad",
													// "5 - balance-tlb",
													"6 - balance-alb",
												], value: "1 - active-backup", on: {
													onChange: (newv, oldv) => {
														if (newv === "1 - active-backup" || newv === "6 - balance-alb") {
															$$("addBond_primaryInterface").show()
															$$("addBond_primaryReselectPolicy").show()
														} else {
															$$("addBond_primaryInterface").hide()
															$$("addBond_primaryReselectPolicy").hide()
														}
													}
												}
											},
											{
												view: "richselect", id: "addBond_primaryInterface", name: "primaryInterface", label: "Primary Interface", labelWidth: labelWidth - 17, options: [],
												invalidMessage: "At least one interface must be selected"
											},
											{
												view: "richselect", id: "addBond_primaryReselectPolicy", label: "Primary Reselect Policy", labelWidth: labelWidth - 17, options: [
													"always",
													"better",
													"failure",
												], value: "always"
											},
										]
									},
									{ height: 20 },
									{
										view: "switch", id: "addBond_dhcpSwitch", label: "DHCP", labelWidth: labelWidth, value: 0, on: {
											onChange: (newv, oldv) => {
												$$("add_bond_form").validate()

												$$("addBond_ipAddressText").define("disabled", newv)
												$$("addBond_gatewayText").define("disabled", newv)
												if (newv == 0) {
													$$("addBond_netmaskCounter").enable()
													$$("addBond_netmaskText").enable()
												} else {
													$$("addBond_netmaskCounter").disable()
													$$("addBond_netmaskText").disable()
												}
												$$("addBond_ipAddressText").refresh()
												$$("addBond_gatewayText").refresh()
												$$("addBond_netmaskCounter").refresh()
											}
										}
									},
									{
										view: "text", id: "addBond_ipAddressText", name: "ipAddress", label: "IP Address", labelWidth: labelWidth, on: {
											onKeyPress: (code, event) => {
												// 8: backspace, 9: tab, 13: enter, 27: esc, 35: end, 37: left, 39: right, 46: delete, 48-57: 0-9, 190: .
												var allowedChars = [8, 9, 13, 27, 35, 37, 39, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 190]
												if (allowedChars.includes(code)) return true
												else return false
											},
											onChange: (newv, oldv) => {
												if (newv == "") {
													if ($$("addBond_dhcpSwitch").getValue() == 0) {
														$$("add_bond_form").markInvalid("ipAddress", "IP address cannot be empty")
													} else {
														$$("add_bond_form").markInvalid("ipAddress", false)
													}
												} else {
													$$("add_bond_form").markInvalid("ipAddress", false)
												}
											}
										},
										invalidMessage: "Invalid IP address"
									},
									{
										cols: [
											{
												view: "counter", id: "addBond_netmaskCounter", label: "Prefix / Netmask", value: 24,
												min: 0, max: 32, step: 1, labelWidth: labelWidth, width: labelWidth + 120,
												on: {
													onChange: (newv, oldv) => {
														$$("addBond_netmaskText").setValue(netmaskConverter(newv))
													}
												}
											},
											{
												view: "text", id: "addBond_netmaskText", readonly: true, on: {
													onBeforeRender: () => {
														var prefix = $$("addBond_netmaskCounter").getValue()
														$$("addBond_netmaskText").setValue(netmaskConverter(prefix))
													}
												}
											}
										]
									},
									{
										view: "text", id: "addBond_gatewayText", label: "Gateway", value: "none", labelWidth: labelWidth, name: "gateway",
										invalidMessage: "Invalid: Must be a valid IP address or 'none'"
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													isInterfaceNameAvailable($$("addBond_interfaceText").getValue())
													// if all fields are valid, then add the VLAN
													if ($$("add_bond_form").validate({ hidden: true }) && interfaceNameAvailable) {
														// initialize variables
														var dhcp = $$("addBond_dhcpSwitch").getValue()
														var ip = ""
														var netmask = ""
														var gateway = ""
														var interface_name = $$("addBond_interfaceText").getValue()
														var bond_primary = $$("addBond_primaryInterface").getValue()
														var bond_primary_reselect = $$("addBond_primaryReselectPolicy").getValue()
														var bond_type = $$("addBond_type").getValue()
														var slaves = $$("addBond_primaryInterface").getList().data.order

														// set variables based on dhcp switch
														if (dhcp === 0) {
															dhcp = "NO"
															ip = $$("addBond_ipAddressText").getValue()
															netmask = $$("addBond_netmaskCounter").getValue()
															gateway = $$("addBond_gatewayText").getValue()
														} else {
															dhcp = "YES"
														}

														if (bond_type === "1 - active-backup" || bond_type === "6 - balance-alb") {
															bond_type = bond_type.split(" - ")[1]
														} else {
															bond_type = bond_type.split(" - ")[1]
															bond_primary = ""
															bond_primary_reselect = ""
														}

														// create json object
														var json_bond = {
															"bond_primary": bond_primary,
															"bond_reselect": bond_primary_reselect,
															"bond_type": bond_type,
															"interface": interface_name,
															"dhcp": dhcp,
															"ip": ip,
															"netmask": netmask.toString(),
															"gateway": gateway == "none" ? "" : gateway,
															"slave_interfaces": slaves,
														}

														webix.ajax().post("/api/network/interfaces/bond", JSON.stringify(json_bond)).then((data) => {
															// refresh the network interface table
															$$("physical_interface_table").clearAll()
															$$("physical_interface_table").load("/api/network/interfaces")
															// hide the window
															this.hideWindow()
															webix.message({ type: "success", text: "Bond interface created", expire: 10000 })
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
					"interface": (value) => {
						if (value.length >= 4 && value.length <= 255) return true
						else return false
					},
					"ipAddress": (value) => {
						// if dhcp is enabled, then ip address is not required
						var dhcp = $$("addBond_dhcpSwitch").getValue()
						if (dhcp == 1) return true
						// if dhcp is disabled, then ip address is required
						var parts = value.split(".")
						if (parts.length != 4) return false
						for (let i = 0; i < parts.length; i++) {
							if (parts[i] < 0 || parts[i] > 254) return false
						}
						return true
					},
					"primaryInterface": webix.rules.isNotEmpty,
				}
			},
			on: {
				onShow: () => {
					webix.ajax().get("/api/network/interfaces").then((response) => {
						$$("addBond_slaveInterfaces").clearAll()
						var data = []
						var interfaces = response.json()
						for (var i = 0; i < interfaces.length; i++) {
							var interfaceData = interfaces[i]
							if (interfaceData.type1 === "Physical" && interfaceData.slaveof === "--") {
								data.push(interfaces[i])
							}
						}
						$$("addBond_slaveInterfaces").parse(data)
					})
				},
				onHide: () => {
					$$("add_bond_form").clear()
					$$("add_bond_form").clearValidation()
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
	init() {
		const backend_url = this.app.config.backend_url

		// loading options into parent networkInterface richselect
		webix.ajax().get("/api/network/interfaces").then((data) => {
			let interfaces = []
			for (let i = 0; i < data.json().length; i++) {
				if (data.json()[i].type1 == "Physical" || data.json()[i].type1 == "Bond")
					interfaces.push(data.json()[i].name)
			}
			$$("addBond_parentInterfaceSelect").define("options", interfaces)
			$$("addBond_parentInterfaceSelect").setValue(interfaces[0].id)
			$$("addBond_parentInterfaceSelect").refresh()
		})
	}
	ready() {
		var networkAddBONDWindow = $$("network_interface_add_bond_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkAddBONDWindow.isVisible())
				networkAddBONDWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}