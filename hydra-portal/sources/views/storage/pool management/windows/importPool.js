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

const windowWidth = 500;
export default class ImportPoolWindow extends JetView {
	config() {
		const topBar = 48
		return {
			view: "window",
			id: "import_pool_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Import Pool", css: "header_label" }
				],
			},
			body: {
				padding: 0,
				rows: [
					{
						cols: [
							{
								width: 12
							},
							{
								view: "label", label: "Select the pools you want to import", css: "label_style"
							}
						]
					},
					{
						view: "datatable",
						id: "import_pool_datatable",
						minRowHeight: 27,
						headerRowHeight: 24,
						borderless: true,
						autoheight: true,
						// scroll: "y",
						tooltip: function (obj) {
							if (!obj.log) return ""
							return obj.log.replace(/\n/g, "<br>")
						},
						columns: [
							{ id: "name", header: "Name", fillspace: true },
							{ id: "import", header: "", width: 40, template: "{common.checkbox()}" },
						],
						url: "/api/storage/pools/import-list",
						ready: function () {
							var data = this.serialize()
							data.forEach((item) => {
								item.import = 0
							})
							this.parse(data)
						},
						on: {
							onCheck: function (rowId, colId, state) {
								var item = this.getItem(rowId)
								item.import = state
								this.updateItem(rowId, item)
							},
							onAfterLoad: function () {
								if (this.count() == 0) {
									this.hide()
									$$("noImportPoolsLabel").show()
								} else {
									this.show()
									$$("noImportPoolsLabel").hide()
								}
							}
						}
					},
					{
						view: "toolbar", id: "noImportPoolsLabel", hidden: true, borderless: true, elements: [
							{
								rows: [
									{
										view: "label",
										label: "No pools found",
										align: "center"
									},
								]
							}
						]
					},
					{},
					{
						padding: {
							left: 10, right: 0, top: 10, bottom: 10
						},
						cols: [
							{
								view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
									var pools_to_import = $$("import_pool_datatable").serialize().map((item) => {
										if (item.import) {
											return item.name
										}
									})

									if (pools_to_import.length == 0) {
										webix.message("Please select at least one pool to import")
										return
									}

									webix.ajax().post("/api/storage/pools/import-list", JSON.stringify({ pools_to_import })).then((data) => {
										webix.message({
											text: data.json(),
											type: "success",
											expire: 5000,
										})

										this.hideWindow()
									}).fail(ajaxFail)
								}
							},
							{
								view: "button", value: "Cancel", css: "new_style_button", width: 70, click: () => {
									this.hideWindow()
								}
							},
						]
					}
				]
			},
			on: {
				onShow: () => {
					$$("import_pool_datatable").load("/api/storage/pools/import-list")
				},
				onHide: () => {
					$$("import_pool_datatable").clearAll()
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
		webix.extend($$("import_pool_window"), webix.ProgressBar)
	}
	ready() {
		var importPoolWindow = $$("import_pool_window")

		webix.UIManager.addHotKey("esc", function () {
			if (importPoolWindow.isVisible())
				importPoolWindow.hide()
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
		const ImportPoolForm = $$("import_pool_form")

		if (ImportPoolForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			ImportPoolForm.config.height = height - (topBar + labelToolbar)
			ImportPoolForm.resize()
		}
	}
}