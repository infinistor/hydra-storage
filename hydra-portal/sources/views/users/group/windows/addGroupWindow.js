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

import { isKeyValidLatinOrNumber } from "../../../../functions/validation";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 500;
export default class AddGroupWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		// variables needed for validation
		const specialChars = ["-", "_"];
		const passwordSpecialChars = ["'", "\"", "`"];

		var groupNameAvailable = false

		function isGroupNameAvailable(value) {
			webix.ajax().get("/api/groups/group-id-taken/" + value).then((data) => {
				var groupIdTaken = data.json()
				if (groupIdTaken) {
					$$("add_group_form").markInvalid("groupId", "Group ID is already taken")
					groupNameAvailable = false
				} else {
					$$("add_group_form").markInvalid("groupId", false)
					groupNameAvailable = true
				}
			})
		}

		return {
			view: "window",
			id: "add_group_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add Group", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_group_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", label: "Group ID", id: "addGroupId", name: "groupId", labelWidth: labelWidth, invalidMessage: "Group ID is required", on: {
											onKeyPress: (code, event) => {
												return isKeyValidLatinOrNumber(code, event) || code == 45 || code == 95
											},
											onChange: function (newValue, oldValue) {
												if (newValue !== "") {
													if (!isNaN(newValue[0]) || specialChars.includes(newValue[0])) {
														$$("add_group_form").markInvalid("groupId", "Group ID must start with a letter")
														groupNameAvailable = false
													} else {
														isGroupNameAvailable(newValue)
													}
												} else {
													$$("add_group_form").markInvalid("groupId", "Group ID cannot be empty")
												}
											},
										}
									},
									{
										view: "text", label: "Comment", id: "addGroupComment", name: "groupComment", labelWidth: labelWidth, on: {
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
												view: "button", value: "Add", css: "new_style_primary", width: 70, click: () => {
													if ($$("addGroupId").getValue() !== "") {
														isGroupNameAvailable($$("addGroupId").getValue())
													}
													if (groupNameAvailable) {
														var group_json = {
															"group_id": $$("addGroupId").getValue(),
															"comment": $$("addGroupComment").getValue()
														}

														webix.ajax().post("/api/groups", JSON.stringify(group_json)).then((data) => {
															var message = data.json()

															$$("groupsTable").clearAll()
															$$("groupsTable").load("/api/groups")
															webix.message({ type: "success", text: message, expire: 10000 })

															this.hideWindow()
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
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
							{}
						]
					},
				],
				rules: {
					"groupId": (value) => {
						if (value.length >= 4 && value.length <= 255) {
							return true
						} else {
							return false
						}
					}
				}
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			},
			on: {
				onHide: () => {
					$$("add_group_form").clear()
					$$("add_group_form").clearValidation()
				}
			}
		}
	}
	ready() {
		var addGroupWindow = $$("add_group_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addGroupWindow.isVisible())
				addGroupWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}