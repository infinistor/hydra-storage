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
export default class AddDiskGroupWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var availableDisks = []
		var pool_id

		return {
			view: "window",
			id: "add_group_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add Disk Group", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "add_group_form",
				elements: [
					{
						// paddingX: 20,
						rows: [
							{
								// width: windowWidth - 40,
								rows: [

									{
										view: "text", label: "Pool Name", labelWidth: labelWidth, name: "pool_name", id: "addGroup_poolName", readonly: true
									},
									{
										height: 15
									},
									{
										view: "label", label: "Current Configuration"
									},
									{
										view: "treetable", id: "addGroup_tree", scroll: "y", autoheight: true, borderless: true, headerRowHeight: 24, columns: [
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
										view: "label", label: "Add New Disk Group"
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
												id: "addGroup_availableDisks",
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
												view: "label", id: "addGroup_noDisks", label: "No disks available", align: "center", hidden: true
											},
											{
												height: 15
											},
											{
												cols: [
													{
														view: "richselect", id: "addGroup_configuration", label: "Configuration", labelWidth: labelWidth, readonly: true, options: [
															{ id: "single", value: "Single" },
															{ id: "mirror", value: "Mirror" },
															{ id: "raidz", value: "RAID5" },
															{ id: "raidz2", value: "RAID6" },
															// { id: "raidz2", value: "RAIDZ2" },
															// { id: "raidz3", value: "RAIDZ3" },
														],
													},
													{
														view: "button", value: "Add group", css: "new_style_primary", width: 90, click: function () {
															// get the selected disks
															var selectedDisks = $$("addGroup_availableDisks").serialize().filter((disk) => {
																return disk.checked == true && disk.disabled == false
															})

															if (selectedDisks.length == 0) {
																webix.message("No disks selected")
																return
															}

															// if they are of different sizes, show an error
															var size = selectedDisks[0].size
															for (var i = 1; i < selectedDisks.length; i++) {
																if (selectedDisks[i].size != size) {
																	webix.message("Selected disks must be of the same size")
																	return
																}
															}

															// check if the number of selected disks is the same as the number of disks in the first group in treetable
															var tree = $$("addGroup_tree").serialize()
															if ($$("addGroup_configuration").getValue() == "single") {

															} else {
																var numberOfDisks = tree[0].data[0].data.length
																if (selectedDisks.length != numberOfDisks) {
																	webix.message("Number of selected disks must be the same as the number of disks in the existing configuration")
																	return
																}
															}


															// hide "no groups" label
															$$("addGroup_noGroups").hide()

															// get the configuration
															var configuration = $$("addGroup_configuration").getValue()

															// calculate the size of the group
															var size = 0
															for (var i = 0; i < selectedDisks.length; i++) {
																size += selectedDisks[i].size.slice(0, -1) * 1 // remove the "G" from the size and convert it to a number
															}

															// add the group to the groups datatable
															$$("addGroup_groups").add({
																configuration: configuration,
																disks: selectedDisks.map((disk) => {
																	return disk.name
																}).join(", "),
																size: size + "G"
															})

															// disable the selected disks in the available disks datatable
															var allDisks = $$("addGroup_availableDisks").serialize()
															for (var i = 0; i < allDisks.length; i++) {
																for (var j = 0; j < selectedDisks.length; j++) {
																	if (allDisks[i].name == selectedDisks[j].name) {
																		allDisks[i].disabled = true
																		$$("addGroup_availableDisks").updateItem(allDisks[i].id, allDisks[i])
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
												id: "addGroup_groups",
												borderless: true,
												columns: [
													{
														id: "configuration", header: "Configuration", adjust: true, template: (obj) => {
															if (obj.configuration == "raidz") {
																return "RAID5"
															} else if (obj.configuration == "raidz2") {
																return "RAID6"
															} else {
																return obj.configuration.charAt(0).toUpperCase() + obj.configuration.slice(1)
															}
														},
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
														var allDisks = $$("addGroup_availableDisks").serialize()
														for (var i = 0; i < allDisks.length; i++) {
															if (disks.includes(allDisks[i].name)) {
																allDisks[i].checked = false
																allDisks[i].disabled = false
																$$("addGroup_availableDisks").updateItem(allDisks[i].id, allDisks[i])
															}
														}

														this.remove(this.getItem(id).id)

														if (this.count() == 0) {
															$$("addGroup_noGroups").show()
														}
													}
												}
											},
											{
												view: "label", label: "No new disk groups added yet", id: "addGroup_noGroups", hidden: false, align: "center"
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
													if ($$("addGroup_groups").serialize().length == 0) {
														// show error message
														webix.message({ type: "error", text: "At least one disk group must be created" })
														return
													}

													$$("add_group_window").disable()
													$$("add_group_window").showProgress({
														type: "icon",
														hide: false,
													})

													var json = {
														"diskGroups": []
													}

													var diskGroups = $$("addGroup_groups").serialize()

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
															$$("add_group_window").enable()
															$$("add_group_window").hideProgress()
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
						$$("addGroup_availableDisks").clearAll()
						var data = response.json()
						availableDisks = data
						$$("addGroup_availableDisks").parse(availableDisks)

						if (availableDisks.length == 0) {
							$$("addGroup_noDisks").show()
						} else {
							$$("addGroup_noDisks").hide()
						}
					})

					webix.ajax().get("/api/storage/pools/" + pool_id).then((response) => {
						var pool = response.json()
						$$("addGroup_poolName").setValue(pool.name)
						$$("addGroup_configuration").setValue(pool.configuration)
					})

					$$("addGroup_tree").load("/api/storage/pools/" + pool_id + "/status").then(() => {
						// $$("addGroup_tree").closeAll()
					})
				},
				onHide: () => {
					$$("addGroup_poolName").setValue("")
					$$("addGroup_tree").clearAll()

					$$("addGroup_configuration").setValue("")

					$$("addGroup_groups").clearAll()
					$$("addGroup_noGroups").show()

					$$("add_group_form").clear()
					$$("add_group_form").clearValidation()

					$$("addGroup_availableDisks").markSorting()
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
		webix.extend($$("add_group_window"), webix.ProgressBar)
	}
	ready() {
		var networkCreatePoolWindow = $$("add_group_window")

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
		const AddGroupForm = $$("add_group_form")

		if (AddGroupForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			AddGroupForm.config.height = height - (topBar + labelToolbar)
			AddGroupForm.resize()
		}
	}
}