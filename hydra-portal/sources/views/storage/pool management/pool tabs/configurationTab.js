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
import DiskContextMenu from "../context menus/diskContextMenu";
import { ajaxFail } from "../../../../functions/ajaxFail";

export default class ConfigurationTab extends JetView {
	config() {
		var baseView = this
		return {
			borderless: true,
			rows: [
				{
					view: "toolbar", borderless: true, elements: [
						{
							view: "icon", id: "zfs_add_icon", icon: "mdi mdi-plus", css: "icon-button",
							click: () => {
								var selectedPool = $$("pools_datatable").getSelectedItem()
								this.setParam("pool_id", selectedPool.id, false)
								$$("zfs_add_configuration_context_menu").show($$("zfs_add_icon").getNode())
								$$("zfs_add_icon").focus()
							}
						},
						{
							view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
								var selectedItem = $$("pools_datatable").getSelectedItem()

								$$("pool_details_tree").clearAll()
								$$("pool_details_tree").load("/api/storage/pools/" + selectedItem.id + "/status")
							}
						},
						{},
					]
				},
				{
					view: "treetable", id: "pool_details_tree", scroll: "y", autoheight: true, borderless: true,
					headerRowHeight: 24,
					css: "storage_datatable",
					// header: false,
					columns: [
						{ id: "value", header: "Name", template: "{common.treetable()} #value#", adjust: true },
						{
							id: "status", header: "Status", adjust: true, template: function (obj) {
								if (!obj.status) {
									return ""
								}

								var style = `
                                padding: 1px 3px;
                                border-radius: 10px;
                                border: transparent solid 1.5px;
                                font-size: 80%;
                            `
								// ONLINE --> Online
								obj.status = obj.status.charAt(0).toUpperCase() + obj.status.slice(1).toLowerCase()

								// if online, return green
								if (obj.status == "Online") {
									return `<span style='color: #00c900; ${style} border-color: #00c900'>${obj.status}</span>`
								} else if (obj.status == "Avail" || obj.status == "Inuse") {
									return `<span style='color: #6493ff; ${style} border-color: #6493ff'>${obj.status}</span>`
								} else {
									return `<span style='color: #ff0000; ${style} border-color: #ff0000'>${obj.status}</span>`
								}
							}
						},
						{
							id: "size", header: "Size", adjust: true, template: function (obj) {
								if (obj.size == undefined) {
									return ""
								} else {
									return obj.size.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
								}
							}
						},
						{ id: "read", header: "Read Errors", adjust: true },
						{ id: "write", header: "Write Errors", adjust: true },
						{ id: "cksum", header: "Checksum Errors", adjust: true },
						{ id: "comment", header: "", adjust: true, fillspace: true },
						{
							id: "settings", header: "", adjust: "data", css: {
								"text-align": "right"
							}, template: (obj) => {
								// if an item does not have children, show settings icon
								if (!obj.$count && obj.$level != 4) {
									return `<button type="button" class="hoverButton webix_icon_button">
                                    <span class="webix_icon mdi mdi-wrench"></span>
                                </button>`
								} else {
									return ""
								}
							}
						}
					],
					onClick: {
						"hoverButton": function (e, id, trg) {
							var item = $$("pool_details_tree").getItem(id)
							if (id.column == "settings") {
								var json
								var parentCategory
								if (item.id.length == 3 && item.id[0] == "1" && item.value.indexOf("Mirror") > -1) {
									// if disk group in data
									json = {
										"diskGroupName": item.value.toLowerCase(),
										"disks": []
									}

									var childId = this.data.getFirstChildId(item.id)
									while (childId) {
										var child = this.getItem(childId)
										json.disks.push(child.value)
										childId = this.data.getNextSiblingId(childId)
									}
								} else if (item.id.length == 3 && item.id[0] != "1") {
									var parent = $$("pool_details_tree").getItem(item.id[0])
									parentCategory = parent.value

									var json = {
										"diskGroupName": "",
									}
									json["disks"] = [item.value]

									parentCategory == "JOURNAL" ? parentCategory = "log" : parentCategory == "CACHE" ? parentCategory = "cache" : parentCategory = "spare"
								}
								baseView.setParam("parent_category", parentCategory, false)
								baseView.setParam("delete_json", json, false)
								baseView.setParam("disk_name", item.value, false)
								$$("disk_context_menu").show(trg)
							}
						},
					}
				},
				{}
			]
		}
	}
	init() {
		this.ui(DiskContextMenu)
	}
}