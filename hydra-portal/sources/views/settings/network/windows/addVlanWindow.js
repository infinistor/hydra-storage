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

import { isKeyValidLatinOrNumber, isKeyValidNumber } from "../../../../functions/validation";
import { netmaskConverter } from "../../../../functions/netmaskConverter";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 500;
export default class AddVLANWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var interfaceNameAvailable = false

		function isInterfaceNameAvailable(value) {
			if (value === "") {
				interfaceNameAvailable = false
			} else {
				webix.ajax().get("/api/network/interface-name-taken/" + value).then((data) => {
					var interfaceNameTaken = data.json()
					if (interfaceNameTaken) {
						$$("add_vlan_form").markInvalid("interface", "Interface name is already taken")
						interfaceNameAvailable = false
					} else {
						$$("add_vlan_form").markInvalid("interface", false)
						interfaceNameAvailable = true
					}
				})
			}
		}

		return {
			view: "window",
			id: "network_interface_add_vlan_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add VLAN", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_vlan_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "richselect", id: "addVlan_parentInterfaceSelect", label: "Parent Interface", name: "parentInterface", labelWidth: labelWidth, on: {
											onChange: (newv, oldv) => {
												if (newv != "") {
													var prefix = $$("addVlan_vlanIdCounter").getValue()
													$$("addVlan_interfaceText").setValue(newv + "." + prefix)
												}
											}
										}, invalidMessage: "Please select a parent interface"
									},
									{
										view: "counter", id: "addVlan_vlanIdCounter", label: "VLAN ID", labelWidth: labelWidth, value: 10, min: 2, max: 4094, step: 1, on: {
											onChange: (newv, oldv) => {
												var networkInterface = $$("addVlan_parentInterfaceSelect").getValue()
												if (networkInterface != "") {
													$$("addVlan_interfaceText").setValue(networkInterface + "." + newv)
												}
											}
										}
									},
									{ height: 20 },
									{
										view: "text", id: "addVlan_interfaceText", label: "Interface", name: "interface", labelWidth: labelWidth, readonly: true, on: {
											onKeyPress: (code, event) => {
												return isKeyValidLatinOrNumber(code, event) || code == 95 || code == 45
											},
											onChange: (newv, oldv) => {
												if (newv !== "") {
													isInterfaceNameAvailable(newv)
												} else {
													$$("add_vlan_form").markInvalid("interface", "Cannot be empty")
												}
											}
										}
									},
									{
										view: "text", label: "Type", value: "VLAN", labelWidth: labelWidth, readonly: true,
									},
									{ height: 20 },
									{
										view: "switch", id: "addVlan_dhcpSwitch", label: "DHCP", labelWidth: labelWidth, value: 0, on: {
											onChange: (newv, oldv) => {
												$$("add_vlan_form").validate()

												$$("addVlan_ipAddressText").define("disabled", newv)
												$$("addVlan_gatewayText").define("disabled", newv)
												if (newv == 0) {
													$$("addVlan_netmaskCounter").enable()
													$$("addVlan_netmaskText").enable()
												} else {
													$$("addVlan_netmaskCounter").disable()
													$$("addVlan_netmaskText").disable()
												}
												$$("addVlan_ipAddressText").refresh()
												$$("addVlan_gatewayText").refresh()
												$$("addVlan_netmaskCounter").refresh()
											}
										}
									},
									{
										view: "text", id: "addVlan_ipAddressText", name: "ipAddress", label: "IP Address", labelWidth: labelWidth, on: {
											onKeyPress: (code, event) => {
												// 190: . (dot)
												return isKeyValidNumber(code, event) || code == 190
											},
										},
										invalidMessage: "Invalid IP address"
									},
									{
										cols: [
											{
												view: "counter", id: "addVlan_netmaskCounter", label: "Prefix / Netmask", value: 24,
												min: 0, max: 32, step: 1, labelWidth: labelWidth, width: labelWidth + 120,
												on: {
													onChange: (newv, oldv) => {
														$$("addVlan_netmaskText").setValue(netmaskConverter(newv))
													}
												}
											},
											{
												view: "text", id: "addVlan_netmaskText", readonly: true, on: {
													onBeforeRender: () => {
														var prefix = $$("addVlan_netmaskCounter").getValue()
														$$("addVlan_netmaskText").setValue(netmaskConverter(prefix))
													}
												}
											}
										]
									},
									{
										view: "text", id: "addVlan_gatewayText", label: "Gateway", value: "none", labelWidth: labelWidth, name: "gateway",
										invalidMessage: "Invalid: Must be a valid IP address or 'none'"
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													isInterfaceNameAvailable($$("addVlan_interfaceText").getValue())
													// if all fields are valid, then add the VLAN
													if ($$("add_vlan_form").validate() && interfaceNameAvailable) {
														// initialize variables
														var dhcp = $$("addVlan_dhcpSwitch").getValue()
														var ip = ""
														var netmask = ""
														var gateway = ""
														var parent = $$("addVlan_parentInterfaceSelect").getValue()
														var vlan_id = $$("addVlan_vlanIdCounter").getValue()
														var interface_name = $$("addVlan_interfaceText").getValue()

														// set variables based on dhcp switch
														if (dhcp === 0) {
															dhcp = "NO"
															ip = $$("addVlan_ipAddressText").getValue()
															netmask = $$("addVlan_netmaskCounter").getValue()
															gateway = $$("addVlan_gatewayText").getValue()
														} else {
															dhcp = "YES"
														}

														// create json object
														var json_vlan = {
															"dhcp": dhcp,
															"gateway": gateway == "none" ? "" : gateway,
															"interface": interface_name,
															"ip": ip,
															"netmask": netmask.toString(),
															"parent": parent,
															"vlan_id": vlan_id.toString(),
														}

														// send json object to server
														webix.ajax().post("/api/network/interfaces/vlan", JSON.stringify(json_vlan)).then((data) => {
															// reload network interfaces datatable
															$$("physical_interface_table").clearAll()
															$$("physical_interface_table").load("/api/network/interfaces")

															webix.message({ type: "success", text: "VLAN interface created", expire: 10000 })
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
						var dhcp = $$("addVlan_dhcpSwitch").getValue()
						if (dhcp == 1) return true
						// if dhcp is disabled, then ip address is required
						var parts = value.split(".")
						if (parts.length != 4) return false
						for (let i = 0; i < parts.length; i++) {
							if (parts[i] < 0 || parts[i] > 254) return false
						}
						return true
					},
					gateway: function (value) {
						// if dhcp is enabled, then gateway is not required
						var dhcp = $$("addVlan_dhcpSwitch").getValue()
						if (dhcp == 1) return true
						// if dhcp is disabled, then gateway is required
						if (value == "none") return true
						var parts = value.split(".")
						if (parts.length != 4) return false
						for (let i = 0; i < parts.length; i++) {
							if (parts[i] < 0 || parts[i] > 254) return false
						}
						return true
					},
					parentInterface: function (value) {
						if (value == "") return false
						else return true
					}
				}
			},
			on: {
				onShow: () => {
					$$("addVlan_interfaceText").setValue("")
					$$("addVlan_parentInterfaceSelect").setValue("")
					$$("addVlan_ipAddressText").setValue("")
					$$("addVlan_gatewayText").setValue("none")

					var interface_name = this.getParam("interface", true)
					if (interface_name != null) {
						$$("addVlan_parentInterfaceSelect").setValue(interface_name)
					}
				},
				onHide: () => {
					$$("add_vlan_form").clear()
					$$("add_vlan_form").clearValidation()
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
				if ((data.json()[i].type1 == "Physical" && data.json()[i].slaveof == "--") || data.json()[i].type1 == "Bond")
					interfaces.push(data.json()[i].name)
			}
			$$("addVlan_parentInterfaceSelect").define("options", interfaces)
			// $$("addVlan_parentInterfaceSelect").setValue(interfaces[0].id)
			$$("addVlan_parentInterfaceSelect").refresh()
		})
	}
	ready() {
		var networkAddVLANWindow = $$("network_interface_add_vlan_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkAddVLANWindow.isVisible())
				networkAddVLANWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}