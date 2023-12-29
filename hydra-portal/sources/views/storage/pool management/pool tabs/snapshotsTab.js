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
import CreateSnapshotWindow from "../windows/createSnapshot";
import SnapshotContextMenu from "../context menus/snapshotContextMenu";

import { searchColumnTemplate } from "../../../../functions/searchTemplate";

var createSnapshotWindow
export default class SnapshotsTab extends JetView {
	config() {
		var baseView = this
		var reloadPools = this.reloadPools
		var searchValue = ""

		return {
			borderless: true,
			padding: 15,
			rows: [
				{
					view: "toolbar", borderless: true, elements: [
						{
							view: "icon", icon: "mdi mdi-plus", css: "icon-button",
							click: () => {
								createSnapshotWindow.showWindow()
							}
						},
						{
							view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
								$$("poolManagementTabSnapshotsDatatable").clearAll()
								$$("poolManagementTabSnapshotsDatatable").load("/api/storage/snapshots")

								reloadPools()
								$$("snapshot_pool_richselect").setValue("")
								$$("snapshot_search").setValue("")
								$$("poolManagementTabSnapshotsDatatable").filterByAll()
								$$("snapshot_dataset_richselect").define("options", [])
								$$("snapshot_dataset_richselect").setValue("")
							}
						},
						{
							view: "search", placeholder: "Search", id: "snapshot_search", width: 250, on: {
								onTimedKeyPress: function () {
									$$("poolManagementTabSnapshotsDatatable").filterByAll()
								}
							}
						},
						{},
						{
							view: "richselect",
							id: "snapshot_pool_richselect",
							label: "Pool",
							clear: "hover",
							placeholder: "All",
							labelWidth: 40,
							minWidth: 150,
							maxWidth: 300,
							stringResult: false,
							options: [],
							suggest: {
								selectAll: true,
							},
							on: {
								onChange: function (newVal, oldVal) {
									if (newVal != "") {
										$$("poolManagementTabSnapshotsDatatable").filterByAll()
										var dataset_multiselect = $$("snapshot_dataset_richselect")
										// Clear the dataset multiselect
										dataset_multiselect.setValue("")

										webix.ajax().get("/api/storage/pools/" + this.getValue() + "/filesystems").then(function (data) {
											var datasets = data.json()
											var datasetOptions = []
											for (var i = 0; i < datasets.length; i++) {
												datasetOptions.push({ id: datasets[i].id, value: datasets[i].name })
											}
											dataset_multiselect.define("options", datasetOptions)
											dataset_multiselect.refresh()
										})
									} else {
										// clear the dataset multiselect
										$$("snapshot_dataset_richselect").setValue("")
									}
									$$("poolManagementTabSnapshotsDatatable").filterByAll()
								}
							}
						},
						{
							view: "richselect",
							id: "snapshot_dataset_richselect",
							label: "Dataset",
							placeholder: "All",
							clear: "hover",
							labelWidth: 60,
							minWidth: 150,
							maxWidth: 300,
							on: {
								onChange: function (newv, oldv) {
									$$("poolManagementTabSnapshotsDatatable").filterByAll()
								}
							}
						},
						{
							width: 5
						}
					]
				},
				{
					view: "treetable",
					id: "poolManagementTabSnapshotsDatatable",
					minRowHeight: 27,
					headerRowHeight: 24,
					borderless: true,
					autoheight: true,
					scroll: "y",
					columns: [
						{
							id: "name", header: "Name", adjust: true, template: function (data, type, value) {
								var text = searchColumnTemplate(value, searchValue)
								return type.treetable(data, type) + text
							}
						},
						{ id: "guid", header: "GUID", adjust: true },
						{
							id: "update_date", header: "Date and Time", adjust: true,
							template: function (obj) {
								if (!obj.update_date) return ""
								var time = (obj.update_date).slice(0, -1) + '+09:00'
								time = new Date(time)
								var format = webix.Date.dateToStr("%Y-%m-%d %H:%i:%s")
								return format(time)
							},
						},
						{
							id: "used", header: "Used", adjust: true, template: function (obj) {
								if (!obj.used) return ""
								return obj.used.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{
							id: "refer", header: "Refer", adjust: true, template: function (obj) {
								if (!obj.refer) return ""
								return obj.refer.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{
							id: "comment", header: "Comments", fillspace: true,
							template: function (data, type, value) {
								return searchColumnTemplate(value, searchValue)
							}
						},
						{
							id: "delete", header: "", width: 70, css: { "text-align": "right" },
							template: function (obj) {
								if (obj.id.length < 5) {
									return ""
								}
								return `<button type="button" class="hoverButton webix_icon_button">
                                    <span class="webix_icon mdi mdi-wrench"></span>
                                </button>`
							}
						},
					],
					url: "/api/storage/snapshots",
					onClick: {
						"hoverButton": function (e, id, trg) {
							var item = this.getItem(id)
							baseView.setParam("snapshot_id", item.uuid, false)
							baseView.setParam("snapshot_name", item.name, false)

							$$("snapshot_context_menu").show(trg)
						}
					},
					ready: function () {
						this.registerFilter(
							$$("snapshot_search"),
							{
								columnId: "comment",
								compare: function (value, filter, item) {
									if (filter == "") {
										return true
									}
									filter = filter.toLowerCase()
									var any = item.name.toLowerCase()
									if (item.comment) {
										any += item.comment.toLowerCase()
									}
									if (any.indexOf(filter) != -1) {
										return true
									}
									return false
								},
							},
							{
								getValue: function (node) {
									return node.getValue();
								},
								setValue: function (node, value) {
									node.setValue(value);
								}
							}
						)

						this.registerFilter(
							$$("snapshot_pool_richselect"),
							{
								columnId: "any",
								compare: function (value, filter, item) {
									if (filter == "") {
										return true
									}

									if (item.name == filter) {
										return true
									}
									return false
								}
							},
							{
								getValue: function (node) {
									return node.getText();
								},
								setValue: function (node, value) {
									node.setValue(value);
								}
							}
						)

						this.registerFilter(
							$$("snapshot_dataset_richselect"),
							{
								columnId: "name",
								compare: function (value, filter, item) {
									if (item.name == filter) {
										return true
									}
									return false
								}
							},
							{
								getValue: function (node) {
									return node.getText();
								},
								setValue: function (node, value) {
									node.setValue(value);
								}
							}
						)
					},
					on: {
						onBeforeFilter: function (id, value, config) {
							if (id == "comment") {
								searchValue = value
							}
						},
						onAfterLoad: function () {
							if (this.count() == 0) {
								this.hide()
								$$("poolManagementTabSnapshotsNoSnapshotsLabel").show()
							} else {
								this.show()
								$$("poolManagementTabSnapshotsNoSnapshotsLabel").hide()
							}
						},
					}
				},
				{
					view: "label", id: "poolManagementTabSnapshotsNoSnapshotsLabel", label: "No snapshots found", align: "center", hidden: true
				},
				{}
			]
		}
	}
	init() {
		createSnapshotWindow = this.ui(CreateSnapshotWindow)
		this.ui(SnapshotContextMenu)

		this.reloadPools()
	}
	reloadPools() {
		webix.ajax().get("/api/storage/pools").then((data) => {
			var pools = data.json()
			var poolOptions = []
			for (var i = 0; i < pools.length; i++) {
				poolOptions.push({ id: pools[i].id, value: pools[i].name })
			}
			$$("snapshot_pool_richselect").define("options", poolOptions)
			$$("snapshot_pool_richselect").refresh()
		})
	}
}