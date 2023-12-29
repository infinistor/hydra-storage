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

import { netmaskConverter } from "functions/netmaskConverter";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 500;
export default class EditVLANWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		return {
			view: "window",
			id: "network_interface_edit_vlan_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Edit VLAN", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "edit_vlan_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "richselect", id: "editVlan_parentInterfaceSelect", label: "Parent Interface", labelWidth: labelWidth, readonly: true, on: {
											onChange: (newv, oldv) => {
												if (newv != "") {
													var prefix = $$("editVlan_vlanIdCounter").getValue()
													$$("editVlan_interfaceText").setValue(newv + "." + prefix)
												}
											}
										},
									},
									{
										view: "counter", id: "editVlan_vlanIdCounter", label: "VLAN ID", labelWidth: labelWidth, readonly: true, value: 10, min: 2, max: 4094, step: 1, on: {
											onChange: (newv, oldv) => {
												var networkInterface = $$("editVlan_parentInterfaceSelect").getValue()
												if (networkInterface != "") {
													$$("editVlan_interfaceText").setValue(networkInterface + "." + newv)
												}
											}
										}
									},
									{ height: 20 },
									{
										view: "text", id: "editVlan_interfaceText", label: "Interface", labelWidth: labelWidth, readonly: true,
									},
									{
										view: "text", label: "Type", value: "VLAN", labelWidth: labelWidth, readonly: true,
									},
									{ height: 20 },
									{
										view: "switch", id: "editVlan_dhcpSwitch", label: "DHCP", labelWidth: labelWidth, value: 1, on: {
											onChange: (newv, oldv) => {
												$$("edit_vlan_form").validate()

												$$("editVlan_ipAddressText").define("disabled", newv)
												$$("editVlan_gatewayText").define("disabled", newv)
												if (newv == 0) {
													$$("editVlan_netmaskCounter").enable()
													$$("editVlan_netmaskText").enable()
												} else {
													$$("editVlan_netmaskCounter").disable()
													$$("editVlan_netmaskText").disable()
												}
												$$("editVlan_ipAddressText").refresh()
												$$("editVlan_gatewayText").refresh()
												$$("editVlan_netmaskCounter").refresh()
											}
										}
									},
									{
										view: "text", id: "editVlan_ipAddressText", name: "ipAddress", label: "IP Address", disabled: true, labelWidth: labelWidth, on: {
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
												view: "counter", id: "editVlan_netmaskCounter", label: "Prefix / Netmask", disabled: true, value: 24,
												min: 0, max: 32, step: 1, labelWidth: labelWidth, width: labelWidth + 120,
												on: {
													onChange: (newv, oldv) => {
														$$("editVlan_netmaskText").setValue(netmaskConverter(newv))
													}
												}
											},
											{
												view: "text", id: "editVlan_netmaskText", readonly: true, disabled: true, on: {
													onBeforeRender: () => {
														var prefix = $$("editVlan_netmaskCounter").getValue()
														$$("editVlan_netmaskText").setValue(netmaskConverter(prefix))
													}
												}
											}
										]
									},
									{
										view: "text", id: "editVlan_gatewayText", label: "Gateway", value: "none", disabled: true, labelWidth: labelWidth, name: "gateway",
										invalidMessage: "Invalid: Must be a valid IP address or 'none'"
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// if all fields are valid, then add the VLAN
													if ($$("edit_vlan_form").validate()) {
														// initialize variables
														var dhcp = $$("editVlan_dhcpSwitch").getValue()
														var ip = ""
														var netmask = ""
														var gateway = ""
														var interface_name = $$("editVlan_interfaceText").getValue()

														// set variables based on dhcp switch
														if (dhcp === 0) {
															dhcp = "NO"
															ip = $$("editVlan_ipAddressText").getValue()
															netmask = $$("editVlan_netmaskCounter").getValue()
															gateway = $$("editVlan_gatewayText").getValue()
														} else {
															dhcp = "YES"
														}

														// create json object
														var json_put = {
															"dhcp": dhcp,
															"ip": ip,
															"netmask": netmask.toString(),
															"gateway": gateway == "none" ? "" : gateway
														}

														// send json object to server
														webix.ajax().put("/api/network/interfaces/" + interface_name, JSON.stringify(json_put)).then((data) => {
															// reload network interfaces datatable
															$$("physical_interface_table").clearAll()
															$$("physical_interface_table").load("/api/network/interfaces")
															webix.message({ type: "success", text: "VLAN interface modified", expire: 10000 })
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
						var dhcp = $$("editVlan_dhcpSwitch").getValue()
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
						var dhcp = $$("editVlan_dhcpSwitch").getValue()
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
				}
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			}, on: {
				onShow: () => {
					var interface_name = this.getParam("interface", true)
					webix.ajax().get("/api/network/interfaces/" + interface_name).then((data) => {
						$$("editVlan_dhcpSwitch").setValue(data.json().dhcp == "YES" ? 1 : 0)
						$$("editVlan_ipAddressText").setValue(data.json().ip)
						$$("editVlan_netmaskCounter").setValue(data.json().netmask)
						$$("editVlan_gatewayText").setValue(data.json().gateway == "N/A" ? "none" : data.json().gateway)
					})
					var interfaceInfo = interface_name.split(".")
					$$("editVlan_parentInterfaceSelect").setValue(interfaceInfo[0])
					$$("editVlan_vlanIdCounter").setValue(interfaceInfo[1])
					$$("editVlan_interfaceText").setValue(interface_name)
				},
				onHide: () => {
					$$("edit_vlan_form").clear()
					$$("edit_vlan_form").clearValidation()
				}
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
			$$("editVlan_parentInterfaceSelect").define("options", interfaces)
			$$("editVlan_parentInterfaceSelect").setValue(interfaces[0].id)
			$$("editVlan_parentInterfaceSelect").refresh()
		})
	}
	ready() {
		var networkAddVLANWindow = $$("network_interface_edit_vlan_window")

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