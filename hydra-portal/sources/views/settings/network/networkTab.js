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
import AddMenu from "./context menus/addMenu";
import PhysicalInterfaceMenu from "./context menus/physicalInterfaceMenu";
import VLANInterfaceMenu from "./context menus/vlanInterfaceMenu";
import BONDInterfaceMenu from "./context menus/bondInterfaceMenu";

import { searchColumnTemplate } from "../../../functions/searchTemplate";
import { netmaskConverter } from "functions/netmaskConverter";

export default class NetworkTab extends JetView {
	config() {
		var access_token = webix.storage.cookie.get("access_token")
		webix.attachEvent("onBeforeAjax", function (mode, url, data, request, headers) { headers["Authorization"] = "Bearer " + access_token; });

		var mainSearchValue = ""
		return {
			id: "networkTab",
			borderless: true,
			rows: [
				{ height: 15 },
				{
					type: "line", paddingX: 15,
					rows: [
						{
							rows: [
								{
									view: "toolbar", borderless: true, elements: [
										{ width: 3 },
										{ view: "label", label: "Network Interfaces", css: "header_label" }
									]
								},
								{
									view: "toolbar", borderless: true, elements: [
										{
											view: "icon", id: "add_icon", icon: "mdi mdi-plus", css: "icon-button",
											click: () => {
												this.setParam("interface", "", false)
												$$("add_menu").show($$("add_icon").getNode())
												$$("add_icon").focus()
											}
										},
										{
											view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
												$$("physical_interface_table").clearAll()
												$$("physical_interface_table").load("/api/network/interfaces")

												mainSearchValue = ""
												$$("networkSearch").setValue("")
											}
										},
										{},
										{
											view: "search", placeholder: "Search", width: 250, id: "networkSearch", on: {
												onTimedKeyPress: function () {
													$$("physical_interface_table").filterByAll();
												}

											}
										},
									]
								},
								{
									view: "datatable",
									id: "physical_interface_table",
									headerRowHeight: 24,
									minRowHeight: 27,
									borderless: true,
									autoheight: true,
									// select: "row",
									scroll: "y",
									subview: function (obj, target) {
										var DHCP = "<div style='padding: 15px 33px'><div><span style='-webkit-text-stroke: 0.4px;'>DHCP: </span>" + obj.dhcp + "</div>"
										var Gateway = "<div><span style='-webkit-text-stroke: 0.4px;'>Gateway: </span>" + obj.gateway + "</div>"
										var MTU = "<div><span style='-webkit-text-stroke: 0.4px;'>MTU: </span>" + obj.mtu + "</div>"
										var MAC = "<div><span style='-webkit-text-stroke: 0.4px;'>MAC: </span>" + obj.mac + "</div>"
										var Duplex = "<div><span style='-webkit-text-stroke: 0.4px;'>Duplex: </span>" + obj.duplex + "</div></div>"
										return webix.ui({
											template: DHCP + Gateway + MTU + MAC + Duplex,
											autoheight: true,
											borderless: true,
										}, target);
									},
									columns: [
										{ id: "subrow", header: "", template: "{common.subrow()}", adjust: "data" },
										{
											id: "name", header: "Name", width: 150, template(data, type, value) {
												return searchColumnTemplate(value, mainSearchValue)
											}
										},
										{ id: "ip", header: "IP", width: 200 },
										{
											id: "type", header: "Type", fillspace: true, template: function (obj) {
												var value = obj.type1
												// if type is Bond, add bond mode
												if (obj.type1 === "Bond") {
													var parts = obj.bondoptions.split(",")
													value += " (" + parts[0].split("=")[1] + ")"
												}
												// if management interface, add management
												if (obj.type2 !== "") {
													value += ", " + obj.type2
												} // if slave, add slave of "master name" 
												else if (obj.slaveof !== "--") {
													value += ", Slave of " + obj.slaveof
												}
												return value
											}
										},
										{
											id: "netmask", header: "Netmask", width: 200, template: function (obj) {
												if (obj.netmask === "N/A") {
													return obj.netmask
												} else {
													return netmaskConverter(obj.netmask)
												}
											}
										},
										{ id: "speed", header: "Speed", width: 150 },
										{
											id: "status", header: "Status", adjust: "data", template: function (obj) {
												if (obj.status === "Active")
													return "<span style='color: #00c900;'>" + obj.status + "</span>"
												else if (obj.status === "Inactive")
													return "<span style='color: red;'>" + obj.status + "</span>"
												else return obj.status
											}
										},
										{
											id: "settings", header: "", adjust: "data",
											template: function () {
												return `<button type="button" class="hoverButton webix_icon_button">
                                                        <span class="webix_icon mdi mdi-wrench"></span>
                                                    </button>`
											}
										},
									],
									url: "/api/network/interfaces",
									onClick: {
										hoverButton: (e, id, target) => {
											var item = $$("physical_interface_table").getItem(id)
											this.setParam("interface", item.name, false)
											this.setParam("status", item.status, false)
											this.setParam("slave", item.slaveof, false)
											if (item.type1 === "Physical") {
												$$("physical_interface_menu").show(target)
											} else if (item.type1 === "VLAN") {
												$$("vlan_interface_menu").show(target)
											} else if (item.type1 === "Bond") {
												$$("bond_interface_menu").show(target)
											}
										}
									},
									on: {
										onBeforeFilter: function (column, value) {
											mainSearchValue = value
										},
									}
								}
							]
						}
					]
				},
				{ height: 15 }
			]
		}
	}
	init() {
		this.ui(AddMenu)
		this.ui(PhysicalInterfaceMenu)
		this.ui(VLANInterfaceMenu)
		this.ui(BONDInterfaceMenu)
	}
	ready() {
		$$("physical_interface_table").registerFilter(
			$$("networkSearch"),
			{
				columnId: "name", compare: function (value, filter, item) {
					value = value.toString().toLowerCase();
					filter = filter.toString().toLowerCase();
					return value.indexOf(filter) !== -1;
				}
			},
			{
				getValue: function (node) {
					return node.getValue();
				},
				setValue: function (node, value) {
					return node.setValue(value);
				}
			}
		);
	}
}