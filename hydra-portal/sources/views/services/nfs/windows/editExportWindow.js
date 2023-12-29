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

const windowWidth = 630;
const topBar = 48;
export default class EditExport extends JetView {
	config() {
		const labelWidth = 230

		var export_id
		return {
			view: "window",
			id: "edit_export_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Edit Export", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "edit_export_form",
				elements: [
					{
						rows: [
							{
								paddingX: 20,
								autoheight: true,
								rows: [
									{ view: "text", id: "editExportName", label: "Export Name", labelWidth: labelWidth, readonly: true },
									{ view: "richselect", id: "editExportPoolSelect", label: "Storage Pool", labelWidth: labelWidth, readonly: true },
									{ view: "richselect", id: "editExportDatasetSelect", label: "Dataset", labelWidth: labelWidth, readonly: true },
									// { view: "text", id: "editExportPath", label: "Storage Path", labelWidth: labelWidth, readonly: true },
									{ view: "text", id: "editExportComment", label: "Comment", name: "comment", labelWidth: labelWidth },
									{ view: "switch", id: "editExportEnableSwitch", label: "Enable", labelWidth: labelWidth }
								]
							},
							{},
							{
								paddingX: 20,
								cols: [
									{
										view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
											var json_export = {
												"comment": $$("editExportComment").getValue(),
												"enabled": $$("editExportEnableSwitch").getValue() == 0 ? "n" : "y",
											}

											webix.ajax().put("/api/nfs/exports/" + export_id, JSON.stringify(json_export)).then((data) => {
												this.hideWindow()
												$$("exports_datatable").clearAll()
												$$("exports_datatable").load("/api/nfs/exports")

												webix.message({ type: "success", text: "Edited export successfully", expire: 10000 })
											}).fail((xhr) => {
												ajaxFail(xhr)
											})
										}
									},
									{
										view: "button", value: "Cancel", css: "new_style_button", width: 70, click: () => {
											this.hideWindow()
										}
									}
								]
							},
							{
								height: 10
							}
						]
					}
				]
			},
			position: function (state) {
				if (this.isVisible()) {
					state.top = topBar
					state.left = state.maxWidth - windowWidth
				} else {
					state.top = topBar
					state.left = state.maxWidth
				}
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			},
			on: {
				onShow: () => {
					export_id = this.getParam("export_id", true)

					webix.ajax().get("/api/nfs/exports/" + export_id).then((data) => {
						$$("editExportName").setValue(data.json().export_name)
						$$("editExportComment").setValue(data.json().comment)
						$$("editExportPoolSelect").setValue(data.json().storage_pool_name)
						$$("editExportDatasetSelect").setValue(data.json().dataset_name)
						// $$("editExportPath").setValue(data.json().storage_path)
						$$("editExportEnableSwitch").setValue(data.json().enabled == "y" ? 1 : 0)
					})
				},
				onHide: function () {
					// clear all fields
					$$("editExportName").setValue("")
					$$("editExportComment").setValue("")
					$$("editExportPoolSelect").setValue("")
					$$("editExportDatasetSelect").setValue("")
					// $$("editExportPath").setValue("")
					$$("editExportEnableSwitch").setValue(0)
				}
			}
		}
	}
	ready() {
		var editExportWindow = $$("edit_export_window")

		webix.UIManager.addHotKey("esc", function () {
			if (editExportWindow.isVisible()) {
				editExportWindow.hide()
			}
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}