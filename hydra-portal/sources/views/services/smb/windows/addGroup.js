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

import { searchColumnTemplate } from "../../../../functions/searchTemplate";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 500;
export default class AddGroup extends JetView {
	config() {
		var group_id
		var readonly

		var mainShareSearchValue = ""

		const topBar = 48

		return {
			view: "window",
			id: "add_group_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Assign Groups to Share", css: "header_label" }
				],
			},
			body: {
				rows: [
					{
						view: "toolbar",
						borderless: true,
						elements: [
							{},
							{
								view: "search",
								placeholder: "Search",
								id: "addGroupSearch",
								width: 150,
								on: {
									onTimedKeyPress: function () {
										$$("smbAddGroupTable").filterByAll();
									}
								}
							}
						]
					},
					{
						view: "datatable",
						id: "smbAddGroupTable",
						borderless: true,
						autoheight: true,
						headerRowHeight: 30,
						select: "row",
						multiselect: true,
						columns: [
							{
								id: "group_id", header: "Group ID", adjust: "data", template(data, type, value) {
									return searchColumnTemplate(value, mainShareSearchValue)
								}
							},
							{
								id: "comment", header: "Comment", fillspace: true, template(data, type, value) {
									return searchColumnTemplate(value, mainShareSearchValue)
								}
							},
							{
								id: "readwrite", header: "Read/Write", template: (obj) => {
									if (readonly) return "<input disabled class='webix_table_checkbox' type='checkbox'>"
									else return `<input class='webix_table_checkbox' type='checkbox'${obj.readwrite == true ? " checked = 'true'" : ""}>`
								},
								adjust: "header", css: "checkboxCenter"
							},
							{
								id: "readonly", header: "Read Only", template: (obj) => {
									return `<input class='webix_table_checkbox' type='checkbox'${obj.readonly == true ? " checked = 'true'" : ""}>`
								},
								adjust: "header", css: "checkboxCenter"
							},
						],
						scroll: "y",
						on: {
							onCheck: function (rowId, columnId, state) {
								if (!state) {
									if (columnId == "readwrite") {
										this.updateItem(rowId, { readwrite: 0 })
									} else if (columnId == "readonly") {
										this.updateItem(rowId, { readonly: 0 })
									}

									this.unselect(rowId, true)
								} else {
									if (columnId == "readwrite") {
										this.updateItem(rowId, { readonly: 0, readwrite: 1 })
									} else if (columnId == "readonly") {
										this.updateItem(rowId, { readwrite: 0, readonly: 1 })
									}

									this.select(rowId, true)
								}
							},
							onAfterLoad: function () {
								this.serialize().forEach((row) => {
									if (row.readonly == 1 || row.readwrite == 1)
										this.select(row.id, true)
								})
							},
							onBeforeSelect: function (selection, preserve) {
								if (selection.column)
									return false
								else {
									return true
								}
							},
							onBeforeFilter(column, value) {
								mainShareSearchValue = value
							},
							onAfterFilter: function () {
								this.serialize().forEach((row) => {
									if (row.readonly == 1 || row.readwrite == 1) {
										this.select(row.id, true)
									}
								})
							}
						}
					},
					{},
					{
						paddingX: 10,
						cols: [
							{
								view: "button",
								value: "Apply",
								css: "new_style_primary",
								width: 70,
								click: () => {
									var json_groups = []
									$$("smbAddGroupTable").serialize().forEach((row) => {
										if ($$("smbAddGroupTable").isSelected(row.id)) {
											if (row.readonly == 1) {
												json_groups.push({ group_id: row.id, group_name: row.group_id, permission: "r" })
											} else {
												json_groups.push({ group_id: row.id, group_name: row.group_id, permission: "w" })
											}
										}
									})

									if (json_groups.length > 0) {
										webix.ajax().put("/api/smb/shares/" + group_id + "/groups", JSON.stringify(json_groups)).then((data) => {
											var groupsTable = $$("share_datatable").getSubView(group_id).getChildViews()[1]

											groupsTable.clearAll()
											groupsTable.load("/api/smb/shares/" + group_id + "/groups").then(function () {
												$$("share_datatable").resizeSubView(group_id)
											})

											this.hideWindow()
											webix.message({ type: "success", text: data.json(), expire: 2000 })
										}).fail((xhr) => {
											ajaxFail(xhr)
										})
									} else {
										webix.message({ type: "error", text: "No groups selected" })
										return
									}
								}
							},
							{
								view: "button",
								value: "Cancel",
								css: "new_style_button",
								width: 70,
								click: () => {
									this.hideWindow()
								}
							}
						]
					},
					{
						height: 10
					}
				]
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			},
			on: {
				onShow: () => {
					$$("smbAddGroupTable").load("/api/groups").then(() => {
						group_id = this.getParam("id", true)
						readonly = this.getParam("readonly", true)

						$$("smbAddGroupTable").serialize().forEach((row) => {
							row.readonly = 0
							row.readwrite = 0
							$$("smbAddGroupTable").unselect(row.id, true)
						})
						$$("smbAddGroupTable").refresh()

						webix.ajax().get("/api/smb/shares/" + group_id + "/groups").then((data) => {
							var groups = data.json()

							if (groups.length > 0) {
								$$("smbAddGroupTable").serialize().forEach((row) => {
									groups.forEach((group) => {
										if (group.group_id == row.id) {
											if (group.permission == 'r') {
												row.readonly = 1
												$$("smbAddGroupTable").select(row.id, true)
											} else {
												row.readwrite = 1
												$$("smbAddGroupTable").select(row.id, true)
											}
										}
									})
								})
								$$("smbAddGroupTable").refresh()
							}
						})
					})
				},
				onHide: () => {
					$$("addGroupSearch").setValue("")
				}
			}
		}
	}
	ready() {
		var addGroupWindow = $$("add_group_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addGroupWindow.isVisible()) {
				addGroupWindow.hide()
			}
		})

		$$("smbAddGroupTable").registerFilter(
			$$("addGroupSearch"),
			{
				columnId: "any",
				compare: function (value, filter, item) {
					if (filter == "") return true
					else {
						var group_id = item.group_id.toLowerCase()
						var comment = item.comment.toLowerCase()
						var filter = filter.toLowerCase()
						var any = group_id + comment
						if (any.indexOf(filter) != -1) return true
						else return false
					}
				}
			},
			{
				getValue: function (node) {
					return node.getValue().toLowerCase()
				},
				setValue: function (node, value) {
					node.setValue(value)
				}
			}
		)
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}

}