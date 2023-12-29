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
export default class EditGroupWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		const passwordSpecialChars = [" ", "'", "\"", "`"];
		return {
			view: "window",
			id: "edit_group_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Edit Group", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "edit_group_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", id: "editGroupId", label: "Group ID", readonly: true, labelWidth: labelWidth
									},
									{
										view: "text", id: "editGroupComment", label: "Comment", name: "editGroupComment", labelWidth: labelWidth, on: {
											onKeyPress: (code, event) => {
												if (passwordSpecialChars.includes(event.key)) {
													return false
												} else {
													return true
												}
											}
										}
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													var id = this.getParam("id", true)

													var group_update = {
														comment: $$("editGroupComment").getValue() == "" ? null : $$("editGroupComment").getValue(),
													}

													webix.ajax().put("/api/groups/" + id, JSON.stringify(group_update)).then((data) => {
														var message = data.json()

														webix.message({
															type: "success",
															text: message,
															expire: 10000
														})

														$$("groupsTable").clearAll()
														$$("groupsTable").load("/api/groups")
														this.hideWindow()
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
							{}
						]
					},
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
					var id = this.getParam("id", true)
					webix.ajax().get("/api/groups/" + id).then((data) => {
						var group = data.json()
						$$("editGroupId").setValue(group.group_id)
						$$("editGroupComment").setValue(group.comment)
					})
				},
				onHide: () => {
					$$("edit_group_form").clear()
				}
			}
		}
	}
	ready() {
		var editGroupWindow = $$("edit_group_window")

		webix.UIManager.addHotKey("esc", function () {
			if (editGroupWindow.isVisible())
				editGroupWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}