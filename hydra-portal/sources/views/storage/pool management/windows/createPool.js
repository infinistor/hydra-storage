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

import { isKeyValidForZFS } from "../../../../functions/validation";

const windowWidth = 600;
export default class CreatePoolWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var poolNameAvailable = false
		var availableDisks = []

		function isPoolNameAvailable(value) {
			if (value === "") {
				poolNameAvailable = false
			} else {
				webix.ajax().get("/api/storage/pools/check/" + value).then((data) => {
					poolNameAvailable = data.json()
					if (poolNameAvailable) {
						$$("create_pool_form").markInvalid("pool_name", false)
						poolNameAvailable = true
					} else {
						$$("create_pool_form").markInvalid("pool_name", "This pool name is already taken")
						poolNameAvailable = false
					}
				})
			}
		}

		return {
			view: "window",
			id: "create_pool_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Create Pool", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "create_pool_form",
				elements: [
					{
						paddingX: 20,
						rows: [
							{
								// width: windowWidth - 40,
								rows: [

									{
										view: "text", label: "Pool Name", labelWidth: labelWidth, name: "pool_name", id: "createPool_poolName", invalidMessage: "Pool name is required", on: {
											onChange(newVal, oldVal) {
												isPoolNameAvailable(newVal)
											},
											OnKeyPress: (code, e) => {
												return isKeyValidForZFS(code, e)
											}
										}
									},
									{
										height: 15
									},
									{
										view: "label", label: "Available Disks"
									},
									{
										// padding: 10,
										rows: [
											{
												view: "datatable",
												headerRowHeight: 24,
												scroll: "y",
												yCount: 6,
												id: "createPool_availableDisks",
												borderless: true,
												columns: [
													{ id: "name", header: "Name", adjust: true, sort: "string" },
													{
														id: "size", header: "Size", sort: "string", fillspace: true, template: function (obj) {
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
												view: "label", id: "createPool_noDisks", label: "No disks available", align: "center", hidden: true, css: {
													"background-color": "#F4F5F9",
												}
											}
										]
									},
									{
										height: 15
									},
									{
										id: "createPool_addGroup",
										cols: [
											{
												view: "richselect", id: "createPool_configuration", label: "Configuration", labelWidth: labelWidth, options: [
													{ id: "single", value: "Single" },
													{ id: "mirror", value: "Mirror" },
													{ id: "raidz", value: "RAID5" },
													{ id: "raidz2", value: "RAID6" },
													// { id: "raidz2", value: "RAIDZ2" },
													// { id: "raidz3", value: "RAIDZ3" },
												], value: "single",
											},
											{
												view: "button", value: "Add group", css: "new_style_primary", width: 90, click: function () {
													// get the selected disks
													var selectedDisks = $$("createPool_availableDisks").serialize().filter((disk) => {
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

													// check if the selected disks are enough for the selected configuration
													var configuration = $$("createPool_configuration").getValue()
													if (configuration == "single") {
														if (selectedDisks.length != 1) {
															webix.message("Single configuration requires exactly 1 disk")
															return
														}
													} else if (configuration == "mirror") {
														if (selectedDisks.length < 2) {
															webix.message("Mirror configuration requires at least 2 disks")
															return
														}
													} else if (configuration == "raidz") {
														if (selectedDisks.length < 2) {
															webix.message("RAID5 configuration requires at least 2 disks")
															return
														}
													} else if (configuration == "raidz2") {
														if (selectedDisks.length < 3) {
															webix.message("RAID6 configuration requires at least 3 disks")
															return
														}
													} else return // this should never happen

													// check if "createPool_groups" already has a group, if yes, check if the current configuration is the same as in the first group
													var groups = $$("createPool_groups").serialize()
													if (groups.length > 0) {
														if (groups[0].configuration != configuration) {
															webix.message("All groups must have the same configuration")
															return
														}
													}

													// check if "createPool_groups" already has a group, if yes:
													// check if the configuration is either raidz or raidz2, if yes:
													// check if the number of disks in the group is the same as the number of disks in the new group
													if (groups.length > 0) {
														if (groups[0].configuration == "raidz" || groups[0].configuration == "raidz2") {
															if (groups[0].disks.split(", ").length != selectedDisks.length) {
																webix.message("RAID disk groups must have the same number of disks")
																return
															}
														}
													}


													// hide "no groups" label
													$$("createPool_noGroups").hide()

													// show the groups datatable
													$$("createPool_groups").show()

													// get the configuration
													var configuration = $$("createPool_configuration").getValue()

													// calculate the size of the group
													var size = 0
													for (var i = 0; i < selectedDisks.length; i++) {
														var number = selectedDisks[i].size.slice(0, -1) * 1 // remove the last character (G, T, etc.) and convert to number
														var unit = selectedDisks[i].size.slice(-1) // get the last character (G, T, etc.)
														if (unit == "M") {
															number *= 1000
														} else if (unit == "G") {
															number *= 1000 * 1000
														} else if (unit == "T") {
															number *= 1000 * 1000 * 1000
														}
														size += number
													}

													// add the group to the groups datatable
													$$("createPool_groups").add({
														configuration: configuration,
														disks: selectedDisks.map((disk) => {
															return disk.name
														}).join(", "),
														size: size > 1000 * 1000 * 1000 ? (size / (1000 * 1000 * 1000)).toFixed(1) + "T" : size > 1000 * 1000 ? (size / (1000 * 1000)).toFixed(1) + "G" : size > 1000 ? (size / 1000).toFixed(1) + "M" : size + "B",
													})

													// disable the selected disks in the available disks datatable
													var allDisks = $$("createPool_availableDisks").serialize()
													for (var i = 0; i < allDisks.length; i++) {
														for (var j = 0; j < selectedDisks.length; j++) {
															if (allDisks[i].name == selectedDisks[j].name) {
																allDisks[i].disabled = true
																$$("createPool_availableDisks").updateItem(allDisks[i].id, allDisks[i])
															}
														}
													}

													// disable the selected disks in the log, cache, and spare multiselect
													for (var i = 0; i < selectedDisks.length; i++) {
														$$("createPool_logDisks").getList().disableItem(selectedDisks[i].name)
														$$("createPool_cacheDisks").getList().disableItem(selectedDisks[i].name)
														$$("createPool_spareDisks").getList().disableItem(selectedDisks[i].name)
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
										hidden: true,
										id: "createPool_groups",
										borderless: true,
										columns: [
											{
												id: "configuration", header: "Configuration", adjust: true, template: (obj) => {
													if (obj.configuration == "single") return "Single"
													else if (obj.configuration == "mirror") return "Mirror"
													else if (obj.configuration == "raidz") return "RAID5"
													else if (obj.configuration == "raidz2") return "RAID6"
													else return "Unknown"
												}
											},
											{ id: "disks", header: "Disks", fillspace: true },
											{
												id: "size", header: "Size", adjust: true, template: function (obj) {
													if (obj.size == undefined) {
														return ""
													} else {
														return obj.size.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
													}
												}
											},
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
												var allDisks = $$("createPool_availableDisks").serialize()
												for (var i = 0; i < allDisks.length; i++) {
													if (disks.includes(allDisks[i].name)) {
														allDisks[i].checked = false
														allDisks[i].disabled = false
														$$("createPool_availableDisks").updateItem(allDisks[i].id, allDisks[i])

														// enable the disk in the log, cache, and spare multiselect
														$$("createPool_logDisks").getList().enableItem(allDisks[i].name)
														$$("createPool_cacheDisks").getList().enableItem(allDisks[i].name)
														$$("createPool_spareDisks").getList().enableItem(allDisks[i].name)
													}
												}

												this.remove(this.getItem(id).id)

												if (this.count() == 0) {
													this.hide()
													$$("createPool_noGroups").show()
												} else {
													this.show()
													$$("createPool_noGroups").hide()
												}
											}
										},
									},
									{
										view: "label", label: "No disk groups added yet", id: "createPool_noGroups", hidden: false, align: "center", css: {
											"background-color": "#F4F5F9",
										}
									},
									{
										height: 15
									},
									{
										view: "multiselect", id: "createPool_logDisks", label: "Journal Disks", labelWidth: labelWidth, on: {
											onChange: function (newVal, oldVal) {
												// enable the previously selected disks in the cache disks and spare disks multiselect
												for (var i = 0; i < oldVal.length; i++) {
													$$("createPool_cacheDisks").getList().enableItem(oldVal[i])
													$$("createPool_spareDisks").getList().enableItem(oldVal[i])
													// enable the disk in the available disks datatable
													var allDisks = $$("createPool_availableDisks").serialize()
													for (var j = 0; j < allDisks.length; j++) {
														if (allDisks[j].name == oldVal[i]) {
															allDisks[j].disabled = false
															$$("createPool_availableDisks").updateItem(allDisks[j].id, allDisks[j])
														}
													}
												}
												// disable the selected disks in the cache disks and spare disks multiselect
												for (var i = 0; i < newVal.length; i++) {
													$$("createPool_cacheDisks").getList().disableItem(newVal[i])
													$$("createPool_spareDisks").getList().disableItem(newVal[i])
													// disable the disk in the available disks datatable
													var allDisks = $$("createPool_availableDisks").serialize()
													for (var j = 0; j < allDisks.length; j++) {
														if (allDisks[j].name == newVal[i]) {
															allDisks[j].disabled = true
															$$("createPool_availableDisks").updateItem(allDisks[j].id, allDisks[j])
														}
													}
												}
											}
										}
									},
									{
										view: "multiselect", id: "createPool_cacheDisks", label: "Cache Disks", labelWidth: labelWidth, on: {
											onChange: function (newVal, oldVal) {
												// enable the previously selected disks in the log disks and spare disks multiselect
												for (var i = 0; i < oldVal.length; i++) {
													$$("createPool_logDisks").getList().enableItem(oldVal[i])
													$$("createPool_spareDisks").getList().enableItem(oldVal[i])
													// enable the disk in the available disks datatable
													var allDisks = $$("createPool_availableDisks").serialize()
													for (var j = 0; j < allDisks.length; j++) {
														if (allDisks[j].name == oldVal[i]) {
															allDisks[j].disabled = false
															$$("createPool_availableDisks").updateItem(allDisks[j].id, allDisks[j])
														}
													}
												}
												// disable the selected disks in the log disks and spare disks multiselect
												for (var i = 0; i < newVal.length; i++) {
													$$("createPool_logDisks").getList().disableItem(newVal[i])
													$$("createPool_spareDisks").getList().disableItem(newVal[i])
													var allDisks = $$("createPool_availableDisks").serialize()
													for (var j = 0; j < allDisks.length; j++) {
														if (allDisks[j].name == newVal[i]) {
															allDisks[j].disabled = true
															$$("createPool_availableDisks").updateItem(allDisks[j].id, allDisks[j])
														}
													}
												}
											}
										}
									},
									{
										view: "multiselect", id: "createPool_spareDisks", label: "Spare Disks", labelWidth: labelWidth, on: {
											onChange: function (newVal, oldVal) {
												// enable the previously selected disks in the log disks and cache disks multiselect
												for (var i = 0; i < oldVal.length; i++) {
													$$("createPool_logDisks").getList().enableItem(oldVal[i])
													$$("createPool_cacheDisks").getList().enableItem(oldVal[i])
													// enable the disk in the available disks datatable
													var allDisks = $$("createPool_availableDisks").serialize()
													for (var j = 0; j < allDisks.length; j++) {
														if (allDisks[j].name == oldVal[i]) {
															allDisks[j].disabled = false
															$$("createPool_availableDisks").updateItem(allDisks[j].id, allDisks[j])
														}
													}
												}
												// disable the selected disks in the log disks and cache disks multiselect
												for (var i = 0; i < newVal.length; i++) {
													$$("createPool_logDisks").getList().disableItem(newVal[i])
													$$("createPool_cacheDisks").getList().disableItem(newVal[i])
													var allDisks = $$("createPool_availableDisks").serialize()
													for (var j = 0; j < allDisks.length; j++) {
														if (allDisks[j].name == newVal[i]) {
															allDisks[j].disabled = true
															$$("createPool_availableDisks").updateItem(allDisks[j].id, allDisks[j])
														}
													}
												}
											}
										}
									},
									{
										view: "switch", id: "createPool_dedup", label: "Deduplication", labelWidth: labelWidth, value: 0,
									},
									{
										view: "switch", id: "createPool_compress", label: "Compression", labelWidth: labelWidth, value: 0, on: {
											onChange: function (newVal, oldVal) {
												if (newVal == 1) {
													$$("createPool_compressAlgorithm").show()
												} else {
													$$("createPool_compressAlgorithm").hide()
												}
											}
										}
									},
									{
										view: "richselect", id: "createPool_compressAlgorithm", label: "Compression Algorithm", labelWidth: labelWidth, options: [
											{ id: "lz4", value: "LZ4" },
											{ id: "gzip", value: "GZIP" },
											{ id: "zle", value: "ZLE" },
											{ id: "lzjb", value: "LZJB" },
											{ id: "zstd", value: "ZSTD" },
										], value: "lz4", hidden: true,
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// check if at least one disk group has been created
													if ($$("createPool_groups").serialize().length == 0) {
														// show error message
														webix.message({ type: "error", text: "At least one disk group must be created" })
														return
													}

													isPoolNameAvailable($$("createPool_poolName").getValue())
													// if all fields are valid, then add the VLAN
													if ($$("create_pool_form").validate({ hidden: true }) && poolNameAvailable) {
														$$("create_pool_window").disable()
														$$("create_pool_window").showProgress({
															type: "icon",
															hide: false,
														})

														var json = {
															"name": $$("createPool_poolName").getValue(),
															"configuration": $$("createPool_configuration").getValue(),
															"dedup": $$("createPool_dedup").getValue() == 1 ? "on" : "off",
															"compression": $$("createPool_compress").getValue() == 1 ? $$("createPool_compressAlgorithm").getValue() : "off",
														}

														if ($$("createPool_logDisks").getValue().length > 0) {
															json["log_disks"] = $$("createPool_logDisks").getValue().split(",")
														}
														if ($$("createPool_cacheDisks").getValue().length > 0) {
															json["cache_disks"] = $$("createPool_cacheDisks").getValue().split(",")
														}
														if ($$("createPool_spareDisks").getValue().length > 0) {
															json["spare_disks"] = $$("createPool_spareDisks").getValue().split(",")
														}

														var disk_groups = []
														var created_groups = $$("createPool_groups").serialize()
														for (var i = 0; i < created_groups.length; i++) {
															var disks = created_groups[i].disks.split(", ")
															disk_groups.push({
																"configuration": created_groups[i].configuration == "single" ? "" : created_groups[i].configuration,
																"disks": disks,
															})
														}

														json["disk_groups"] = disk_groups

														webix.ajax().post("/api/storage/pools", JSON.stringify(json)).then((response) => {
															var data = response.json()
															webix.message({ type: "default", text: data, expire: 10000 })
															$$("pools_datatable").load("/api/storage/pools")

															$$("create_pool_window").enable()
															$$("create_pool_window").hideProgress()
															this.hideWindow()
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
													} else {
														return false
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
						]
					},
				],
				rules: {
					"pool_name": webix.rules.isNotEmpty,
				}
			},
			on: {
				onShow: () => {
					webix.ajax().get("/api/storage/pools/disks").then((response) => {
						$$("createPool_availableDisks").clearAll()
						var data = response.json()
						availableDisks = data
						$$("createPool_availableDisks").parse(availableDisks)

						if (availableDisks.length == 0) {
							$$("createPool_availableDisks").hide()
							$$("createPool_noDisks").show()

							// if no available disks, then hide everything else
							$$("createPool_addGroup").hide()
							$$("createPool_noGroups").hide()
							$$("createPool_logDisks").hide()
							$$("createPool_cacheDisks").hide()
							$$("createPool_spareDisks").hide()
							$$("createPool_dedup").hide()
							$$("createPool_compress").hide()
						} else {
							$$("createPool_availableDisks").show()
							$$("createPool_noDisks").hide()

							$$("createPool_addGroup").show()
							$$("createPool_noGroups").show()
							$$("createPool_logDisks").show()
							$$("createPool_cacheDisks").show()
							$$("createPool_spareDisks").show()
							$$("createPool_dedup").show()
							$$("createPool_compress").show()
						}

						var availableDisksTemp = availableDisks.map((disk) => {
							return { id: disk.name, value: disk.name }
						})
						$$("createPool_logDisks").define("options", JSON.parse(JSON.stringify(availableDisksTemp)))
						$$("createPool_cacheDisks").define("options", JSON.parse(JSON.stringify(availableDisksTemp)))
						$$("createPool_spareDisks").define("options", JSON.parse(JSON.stringify(availableDisksTemp)))
					})
				},
				onHide: () => {
					$$("createPool_configuration").setValue("single")
					$$("createPool_dedup").setValue(0)
					$$("createPool_compress").setValue(0)

					$$("createPool_groups").clearAll()
					$$("createPool_logDisks").setValue("")
					$$("createPool_cacheDisks").setValue("")
					$$("createPool_spareDisks").setValue("")

					$$("createPool_noGroups").show()

					$$("create_pool_form").clear()
					$$("create_pool_form").clearValidation()

					$$("createPool_availableDisks").markSorting()
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
		webix.extend($$("create_pool_window"), webix.ProgressBar)
	}
	ready() {
		var networkCreatePoolWindow = $$("create_pool_window")

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
		const CreatePoolForm = $$("create_pool_form")

		if (CreatePoolForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			CreatePoolForm.config.height = height - (topBar + labelToolbar)
			CreatePoolForm.resize()
		}
	}
}