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
import EditBONDWindow from "../windows/editBondWindow";

var editBONDWindow
export default class BONDInterfaceMenu extends JetView {
	config() {
		var options = []
		var control = this.controlInterface
		var deleteBond = this.deleteBond
		var editBond = this.editBond
		return {
			view: "contextmenu",
			id: "bond_interface_menu",
			data: options,
			on: {
				onItemClick: (id) => {
					var interface_name = this.getParam("interface", true);
					switch (id) {
						case "Edit":
							editBond()
							break;
						case "Deactivate":
							control(interface_name, "Deactivate")
							break;
						case "Activate":
							control(interface_name, "Activate")
							break;
						case "Add VLAN":
							$$("network_interface_add_vlan_window").show()
							break;
						case "Remove":
							deleteBond(interface_name)
							break;
					}
				},
				onBeforeShow: () => {
					options = []
					options.push("Edit")
					var status = this.getParam("status", true);
					if (status == "Active") {
						options.push("Deactivate")
					} else {
						options.push("Activate")
					}
					options.push("Add VLAN", "Remove")

					$$("bond_interface_menu").clearAll()
					$$("bond_interface_menu").parse(options)
				}
			}
		}
	}
	init() {
		editBONDWindow = this.ui(EditBONDWindow)
	}
	editBond() {
		editBONDWindow.showWindow()
	}
	controlInterface(interface_name, action) {
		var json_control = {
			"interface": interface_name,
			"action": action
		}
		webix.ajax().put("/api/network/interfaces/control", JSON.stringify(json_control)).then(function (data) {
			$$("physical_interface_table").clearAll()
			$$("physical_interface_table").load("/api/network/interfaces")

			webix.message({
				type: "success",
				text: data.json(),
				expire: 2000
			})
		}).fail((xhr) => {
			ajaxFail(xhr)
		})
	}
	deleteBond(interface_name) {
		webix.ajax().del("/api/network/interfaces/bond/" + interface_name).then(function (data) {
			$$("physical_interface_table").clearAll()
			$$("physical_interface_table").load("/api/network/interfaces")

			webix.message({
				type: "success",
				text: data.json(),
				expire: 2000
			})
		}).fail((xhr) => {
			ajaxFail(xhr)
		})
	}
}