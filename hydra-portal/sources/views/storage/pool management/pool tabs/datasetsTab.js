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
import CreateDatasetWindow from "../windows/createDataset";
import DatasetContextMenu from "../context menus/datasetContextMenu";

import { searchColumnTemplate } from "../../../../functions/searchTemplate";

var createDatasetWindow
export default class DatasetsTab extends JetView {
	config() {
		var baseView = this

		var searchValue = ""

		return {
			borderless: true,
			rows: [
				{
					view: "toolbar", borderless: true, elements: [
						{
							view: "icon", icon: "mdi mdi-plus", css: "icon-button",
							click: () => {
								var selectedPool = $$("pools_datatable").getSelectedItem()
								baseView.setParam("pool_id", selectedPool.id, false)
								createDatasetWindow.showWindow()
							}
						},
						{
							view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
								$$("poolManagementTabDatasetsDatatable").clearAll()
								$$("poolManagementTabDatasetsDatatable").load("/api/storage/pools/" + $$("pools_datatable").getSelectedItem().id + "/filesystems")
							}
						},
						{},
						{
							view: "search", placeholder: "Search", id: "dataset_search", width: 250, on: {
								onTimedKeyPress: function () {
									$$("poolManagementTabDatasetsDatatable").filterByAll()
								}

							}
						},
					]
				},
				{
					view: "datatable",
					id: "poolManagementTabDatasetsDatatable",
					minRowHeight: 27,
					headerRowHeight: 24,
					borderless: true,
					autoheight: true,
					scroll: "y",
					columns: [
						{
							id: "name", header: "Name", adjust: true, template: function (data, type, value) {
								return searchColumnTemplate(value, searchValue)
							}
						},
						{
							id: "available", header: "Available", adjust: true, template: function (obj) {
								return obj.available.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{
							id: "used", header: "Used", adjust: true, template: function (obj) {
								return obj.used.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{
							id: "dedup", header: "Deduplication", adjust: true, template: function (obj) {
								var dedup = obj.dedup
								if (dedup == "off" || dedup == "on") {
									// capitalize first letter
									dedup = dedup.charAt(0).toUpperCase() + dedup.slice(1);
								} else {
									// capitalize all letters
									dedup = dedup.toUpperCase()
								}
								return dedup
							}
						},
						{
							id: "compression", header: "Compression", adjust: true, template: function (obj) {
								var compression = obj.compression
								if (compression == "off" || compression == "on") {
									// capitalize first letter
									compression = compression.charAt(0).toUpperCase() + compression.slice(1);
								} else {
									// capitalize all letters
									compression = compression.toUpperCase()
								}
								return compression
							}
						},
						{
							id: "quota", header: "Quota", adjust: true, template: function (obj) {
								if (obj.quota == "none") {
									// long dash
									return "&#8211;"
								}
								return obj.quota.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{
							id: "reservation", header: "Reservation", adjust: true, template: function (obj) {
								if (obj.reservation == "none") {
									// long dash
									return "&#8211;"
								}
								return obj.reservation.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{
							id: "record_size", header: "Record Size", adjust: true, template: function (obj) {
								return obj.record_size.replace("m", "MiB").replace("k", "KiB")
							}
						},
						{ id: "comment", header: "Comments", fillspace: true },
						{
							id: "settings", header: "", adjust: "data",
							template: function () {
								return `<button type="button" class="hoverButton webix_icon_button">
                                        <span class="webix_icon mdi mdi-wrench"></span>
                                    </button>`
							}
						},
					],
					onClick: {
						hoverButton: (e, id, target) => {
							var selectedPool = $$("pools_datatable").getSelectedItem()
							baseView.setParam("pool_id", selectedPool.id, false)
							baseView.setParam("dataset_id", id.row, false)
							var datasetName = $$("poolManagementTabDatasetsDatatable").getItem(id.row).name
							baseView.setParam("dataset_name", datasetName, false)

							$$("zfs_dataset_context_menu").show(target)
						}
					},
					ready: function () {
						this.registerFilter(
							$$("dataset_search"),
							{
								columnId: "name",
								compare: function (value, filter, item) {
									filter = filter.toLowerCase()
									var any = item.name.toLowerCase()
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
					},
					on: {
						onBeforeFilter: function (id, value, config) {
							searchValue = value
						},
						onAfterLoad: function () {
							if (this.count() == 0) {
								this.hide()
								$$("poolManagementTabDatasetsDatatableNoDatasetsLabel").show()
							} else {
								this.show()
								$$("poolManagementTabDatasetsDatatableNoDatasetsLabel").hide()
							}
						},
						onAfterDelete: function () {
							if (this.count() == 0) {
								this.hide()
								$$("poolManagementTabDatasetsDatatableNoDatasetsLabel").show()
							} else {
								this.show()
								$$("poolManagementTabDatasetsDatatableNoDatasetsLabel").hide()
							}
						}
					}
				},
				{
					view: "label", id: "poolManagementTabDatasetsDatatableNoDatasetsLabel", label: "No datasets found", align: "center", hidden: true
				},
				{}
			]
		}
	}
	init() {
		createDatasetWindow = this.ui(CreateDatasetWindow)
		this.ui(DatasetContextMenu)
	}
}