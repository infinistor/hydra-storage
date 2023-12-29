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
import { ipAddressValidator, ipAddressStringValidator } from "../../../../functions/IPAddressValidation";

var previous_interface = ""
var previous_interface_gateway = ""
export default class ManagementNetworkInterfaceAccordion extends JetView {
	config() {
		const labelWidth = 300

		var loadManagement = this.loadManagement

		return {
			borderless: true,
			rows: [
				{
					view: "form",
					elements: [
						{
							cols: [
								{
									width: 600,
									rows: [
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
										// { height: 10 },
										{
											view: "text", id: "managementIp", label: "IP Address", labelWidth: labelWidth,
											// readonly: true,
										},
										// { height: 10 },
										// {
										//     view: "text", id: "managementNetmask", label: "Netmask", labelWidth: labelWidth, 
										//     // readonly: true,
										// },
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
										// { height: 10 },
										{
											view: "text", id: "managementGateway", label: "Gateway", labelWidth: labelWidth,
											// readonly: true,
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
														loadManagement()

														webix.message({ type: "success", text: "Updated management interface settings", expire: 10000 })
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
				}
			]
		}
	}
	init() {
		this.loadManagement()
	}
	loadManagement() {
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
		})
	}
}