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
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 600;
export default class AddSpareWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var availableDisks = []
		var pool_id

		return {
			view: "window",
			id: "add_spare_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add Spare Disks", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "add_spare_form",
				elements: [
					{
						// paddingX: 20,
						rows: [
							{
								// width: windowWidth - 40,
								rows: [

									{
										view: "text", label: "Pool Name", labelWidth: labelWidth, name: "pool_name", id: "addSpare_poolName", readonly: true
									},
									{
										height: 15
									},
									{
										view: "label", label: "Current Configuration"
									},
									{
										view: "treetable", id: "addSpare_tree", scroll: "y", autoheight: true, borderless: true, headerRowHeight: 24, columns: [
											{
												id: "value", header: "Name", adjust: true, template: "{common.treetable()} #value#"
											},
											{
												id: "status", header: "Status", adjust: true, template: function (obj) {
													if (!obj.status) {
														return ""
													}

													if (obj.status == "ONLINE") {
														return "<span style='color: #00c900'>" + obj.status + "</span>"
													} else if (obj.status == "AVAIL" || obj.status == "INUSE") {
														return "<span style='color: #6493ff'>" + obj.status + "</span>"
													} else {
														return "<span style='color:red'>" + obj.status + "</span>"
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
											{ id: "read", header: "Read", adjust: true },
											{ id: "write", header: "Write", adjust: true },
											{ id: "cksum", header: "Checksum", adjust: true },
											{ id: "comment", header: "", fillspace: true },
										]
									},
									{
										height: 15
									},
									{
										view: "label", label: "Add Spare Disks"
									},
									{
										paddingX: 15,
										rows: [
											{
												view: "label", label: "Available Disks"
											},
											{
												view: "datatable",
												headerRowHeight: 24,
												scroll: "y",
												yCount: 6,
												id: "addSpare_availableDisks",
												borderless: true,
												columns: [
													{ id: "name", header: "Name", adjust: true, sort: "string" },
													{
														id: "size", header: "Size", fillspace: true, sort: "string", template: function (obj) {
															if (obj.size == undefined) {
																return ""
															} else {
																return obj.size.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
															}
														}
													},
													{
														id: "select", header: "", template: (obj) => {
															return `<input ${obj.disabled ? "disabled" : ""} class='webix_table_checkbox' type='checkbox'${obj.checked == true ? " checked = 'true'" : ""}>`
														}, width: 60, css: "checkboxCenter"
													},
												],
												data: [],
												on: {
													onCheck: function (rowId, columnId, state) {
														// update the checked value of the disk
														this.getItem(rowId).checked = state
													},
													onAfterLoad: function () {
														// adjust scroll height
														var yCount = this.count() < 6 ? this.count() : 6;
														this.define({ yCount: yCount });
														this.refresh();

														var disks = this.serialize()
														// set every disk to checked = false
														for (var i = 0; i < disks.length; i++) {
															disks[i].checked = false
															disks[i].disabled = false
														}
													}
												}
											},
											{
												view: "label", id: "addSpare_noDisks", label: "No disks available", align: "center", hidden: true
											},
											{
												height: 15
											},
											{
												cols: [
													{
														view: "richselect", id: "addSpare_configuration", label: "Configuration", labelWidth: labelWidth, readonly: true, options: [
															{ id: "spare", value: "Spare" },
														], value: "spare"
													},
													{
														view: "button", value: "Add", css: "new_style_primary", width: 70, click: function () {
															// get the selected disks
															var selectedDisks = $$("addSpare_availableDisks").serialize().filter((disk) => {
																return disk.checked == true && disk.disabled == false
															})

															if (selectedDisks.length == 0) {
																webix.message("No disks selected")
																return
															}


															// hide "no groups" label
															$$("addSpare_noGroups").hide()

															// get the configuration
															var configuration = $$("addSpare_configuration").getValue()

															// calculate the size of the group
															var size = 0
															for (var i = 0; i < selectedDisks.length; i++) {
																size += selectedDisks[i].size.slice(0, -1) * 1 // remove the "G" from the size and convert it to a number
															}

															// add the group to the groups datatable
															$$("addSpare_groups").add({
																configuration: configuration,
																disks: selectedDisks.map((disk) => {
																	return disk.name
																}).join(", "),
																size: size + "G"
															})

															// disable the selected disks in the available disks datatable
															var allDisks = $$("addSpare_availableDisks").serialize()
															for (var i = 0; i < allDisks.length; i++) {
																for (var j = 0; j < selectedDisks.length; j++) {
																	if (allDisks[i].name == selectedDisks[j].name) {
																		allDisks[i].disabled = true
																		$$("addSpare_availableDisks").updateItem(allDisks[i].id, allDisks[i])
																	}
																}
															}
														}
													}
												]
											},
											{
												height: 15
											},
											{
												view: "datatable",
												headerRowHeight: 24,
												scroll: "y",
												autoheight: true,
												id: "addSpare_groups",
												borderless: true,
												columns: [
													{
														id: "configuration", header: "Configuration", adjust: true, template: (obj) => {
															if (obj.configuration == "spare") {
																return "Spare"
															} else {
																return obj.configuration
															}
														}
													},
													{ id: "disks", header: "Disks", fillspace: true },
													{ id: "size", header: "Size", adjust: true },
													{
														id: "remove", header: "", template: (obj) => {
															return `<span class="webix_icon wxi-trash remove_group"></span>`
														}, width: 60,
													},
												],
												onClick: {
													remove_group: function (e, id, trg) {
														var config = this.getItem(id)
														var disks = config.disks.split(", ")
														// enable the disks in the available disks datatable
														var allDisks = $$("addSpare_availableDisks").serialize()
														for (var i = 0; i < allDisks.length; i++) {
															if (disks.includes(allDisks[i].name)) {
																allDisks[i].checked = false
																allDisks[i].disabled = false
																$$("addSpare_availableDisks").updateItem(allDisks[i].id, allDisks[i])
															}
														}

														this.remove(this.getItem(id).id)

														if (this.count() == 0) {
															$$("addSpare_noGroups").show()
														}
													}
												}
											},
											{
												view: "label", label: "No spare disks added yet", id: "addSpare_noGroups", hidden: false, align: "center"
											},
										]
									},
									{
										height: 15
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// check if at least one disk group has been created
													if ($$("addSpare_groups").serialize().length == 0) {
														// show error message
														webix.message({ type: "error", text: "At least one log disk should be added" })
														return
													}

													$$("add_spare_window").disable()
													$$("add_spare_window").showProgress({
														type: "icon",
														hide: false,
													})

													var json = {
														"diskGroups": []
													}

													var diskGroups = $$("addSpare_groups").serialize()

													for (var i = 0; i < diskGroups.length; i++) {
														var disks = diskGroups[i].disks.split(", ")
														var configuration = diskGroups[i].configuration
														json["diskGroups"].push({
															"configuration": configuration,
															"disks": disks
														})
													}

													webix.ajax().post("/api/storage/pools/" + pool_id + "/diskgroups", JSON.stringify(json)).then((response) => {
														var data = response.json()
														webix.message({ type: "default", text: data, expire: 10000 })

														$$("pool_details_tree").load("/api/storage/pools/" + pool_id + "/status").then(() => {
															$$("add_spare_window").enable()
															$$("add_spare_window").hideProgress()
															this.hideWindow()
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
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
						]
					},
				],
			},
			on: {
				onShow: () => {
					pool_id = this.getParam("pool_id", true)

					webix.ajax().get("/api/storage/pools/disks").then((response) => {
						$$("addSpare_availableDisks").clearAll()
						var data = response.json()
						availableDisks = data
						$$("addSpare_availableDisks").parse(availableDisks)

						if (availableDisks.length == 0) {
							$$("addSpare_noDisks").show()
						} else {
							$$("addSpare_noDisks").hide()
						}
					})

					webix.ajax().get("/api/storage/pools/" + pool_id).then((response) => {
						var pool = response.json()
						$$("addSpare_poolName").setValue(pool.name)
					})

					$$("addSpare_tree").load("/api/storage/pools/" + pool_id + "/status").then(() => {
						// $$("addSpare_tree").closeAll()
					})
				},
				onHide: () => {
					$$("addSpare_poolName").setValue("")
					$$("addSpare_tree").clearAll()

					$$("addSpare_configuration").setValue("spare")

					$$("addSpare_groups").clearAll()
					$$("addSpare_noGroups").show()

					$$("add_spare_form").clear()
					$$("add_spare_form").clearValidation()

					$$("addSpare_availableDisks").markSorting()
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
		webix.extend($$("add_spare_window"), webix.ProgressBar)
	}
	ready() {
		var networkCreatePoolWindow = $$("add_spare_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkCreatePoolWindow.isVisible())
				networkCreatePoolWindow.hide()
		})

		var resize = this.resizeElement
		webix.event(window, "resize", function () {
			resize()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
	resizeElement() {
		const AddSpareForm = $$("add_spare_window")

		if (AddSpareForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			AddSpareForm.config.height = height - (topBar + labelToolbar)
			AddSpareForm.resize()
		}
	}
}