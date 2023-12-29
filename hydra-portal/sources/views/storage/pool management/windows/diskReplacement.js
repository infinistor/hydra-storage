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
export default class DiskReplacementWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200
		var availableDisks = []
		var poolRefId
		var diskToReplace

		return {
			view: "window",
			id: "disk_replacement_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Replace Disk", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "disk_replacement_form",
				elements: [
					{
						paddingX: 20,
						rows: [
							{
								rows: [

									{
										view: "text", label: "Pool Name", labelWidth: labelWidth, id: "diskReplacement_poolName", readonly: true
									},
									{
										view: "text", label: "Disk to Replace", labelWidth: labelWidth, id: "diskReplacement_diskToReplace", readonly: true
									},
									{
										height: 15
									},
									{
										view: "label", label: "Available Disks"
									},
									{
										rows: [
											{
												view: "datatable",
												headerRowHeight: 24,
												scroll: "y",
												yCount: 12,
												id: "diskReplacement_availableDisks",
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
														// check if any other disk is checked -> if yes, uncheck it
														var disks = this.serialize()
														for (var i = 0; i < disks.length; i++) {
															if (disks[i].id != rowId && disks[i].checked == true) {
																disks[i].checked = false
															}
														}
														// update the checked value of the disk
														this.getItem(rowId).checked = state
													},
													onAfterLoad: function () {
														// adjust scroll height
														var yCount = this.count() < 12 ? this.count() : 12;
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
												view: "label", id: "diskReplacement_noDisks", label: "No disks available", align: "center", hidden: true, css: {
													"background-color": "#F4F5F9",
												}
											}
										]
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// check if at least one disk has been selected
													var disks = $$("diskReplacement_availableDisks").serialize()
													var new_disk
													for (var i = 0; i < disks.length; i++) {
														if (disks[i].checked == true) {
															new_disk = disks[i].name
															break
														}
													}

													if (!new_disk) {
														// if no disk has been selected, show error message
														webix.message({
															type: "error",
															text: "Please select a disk",
															expire: 5000,
														})
														return
													}

													$$("disk_replacement_window").disable()
													$$("disk_replacement_window").showProgress({
														type: "icon",
														hide: false,
													})

													var json = {
														"old_disk": diskToReplace,
														"new_disk": new_disk,
													}

													webix.ajax().post("/api/storage/pools/" + poolRefId + "/replace-disk", JSON.stringify(json)).then((response) => {
														var data = response.json()
														webix.message({ type: "default", text: data, expire: 10000 })

														this.hideWindow()
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
													$$("disk_replacement_window").enable()
													$$("disk_replacement_window").hideProgress()
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
					webix.ajax().get("/api/storage/pools/disks").then((response) => {
						$$("diskReplacement_availableDisks").clearAll()
						var data = response.json()
						availableDisks = data
						$$("diskReplacement_availableDisks").parse(availableDisks)

						if (availableDisks.length == 0) {
							$$("diskReplacement_availableDisks").hide()
							$$("diskReplacement_noDisks").show()
						} else {
							$$("diskReplacement_availableDisks").show()
							$$("diskReplacement_noDisks").hide()
						}

						poolRefId = this.getParam("pool_id", true)
						diskToReplace = this.getParam("disk_name", true)

						webix.ajax().get("/api/storage/pools/" + poolRefId).then((response) => {
							var data = response.json()
							$$("diskReplacement_poolName").setValue(data.name)
							$$("diskReplacement_diskToReplace").setValue(diskToReplace)
						})
					})
				},
				onHide: () => {
					$$("diskReplacement_availableDisks").markSorting()
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
		webix.extend($$("disk_replacement_window"), webix.ProgressBar)
	}
	ready() {
		var diskReplacementWindow = $$("disk_replacement_window")

		webix.UIManager.addHotKey("esc", function () {
			if (diskReplacementWindow.isVisible())
				diskReplacementWindow.hide()
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
		const DiskReplacementForm = $$("disk_replacement_form")

		if (DiskReplacementForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			DiskReplacementForm.config.height = height - (topBar + labelToolbar)
			DiskReplacementForm.resize()
		}
	}
}