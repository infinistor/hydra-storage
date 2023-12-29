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
export default class EditUserWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		const usernameSpecialChars = ["~", "!", "@", "#", "$", "^", "&", "(", ")", "+", "[", "]", "{", "}", "*", ";", ":", "'", "\"", ".", ",", "%", "|", "<", ">", "?", "/", "\\", "=", "`", " "];
		const passwordSpecialChars = [" ", "'", "\"", "`"];
		return {
			view: "window",
			id: "edit_user_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Edit User", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "edit_user_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", id: "editUserId", label: "User ID", labelWidth: labelWidth, readonly: true
									},
									{
										view: "text", id: "editUserName", label: "User Name", labelWidth: labelWidth, name: "name", invalidMessage: "Name is required", on: {
											onKeyPress(code, event) {
												if (usernameSpecialChars.includes(event.key))
													return false
												else return true
											},
											onChange(newv, oldv) {
												if (newv === "") {
													$$("edit_user_form").markInvalid("name", "User Name cannot be empty")
												} else {
													$$("edit_user_form").markInvalid("name", false)
												}
											}
										}
									},
									{
										view: "text", id: "editUserPassword", label: "Password", name: "password", type: "password", labelWidth: labelWidth, on: {
											onKeyPress(code, event) {
												if (passwordSpecialChars.includes(event.key))
													return false
												else return true
											},
											onChange(newv, oldv) {
												if (newv === "") {
													$$("edit_user_form").markInvalid("password", "Password cannot be empty")
												} else {
													$$("edit_user_form").markInvalid("password", false)
												}
											}
										}
									},
									{
										view: "text", id: "editUserPasswordConfirm", label: "Password Confirm", type: "password", labelWidth: labelWidth, on: {
											onKeyPress(code, event) {
												if (passwordSpecialChars.includes(event.key))
													return false
												else return true
											},
											onChange(newv, oldv) {
												if (newv !== "" && newv !== $$("editUserPassword").getValue()) {
													$$("edit_user_form").markInvalid("passwordConfirm", "Passwords do not match")
												} else {
													$$("edit_user_form").markInvalid("passwordConfirm", false)
												}
											}
										},
										name: "passwordConfirm", invalidMessage: "Passwords do not match"
									},
									{
										view: "text", id: "editUserEmail", label: "Email", type: "email", labelWidth: labelWidth, type: "email", name: "email", invalidMessage: "Email is not valid", on: {
											onChange(newv, oldv) {
												$$("edit_user_form").validate()
											}
										}
									},
									{
										view: "text", id: "editUserComment", label: "Comment", labelWidth: labelWidth, on: {
											onKeyPress(code, event) {
												if (passwordSpecialChars.includes(event.key))
													return false
												else return true
											}
										}
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													if ($$("edit_user_form").validate()) {
														var id = this.getParam("id", true)
														var user = {
															name: $$("editUserName").getValue() == "" ? null : $$("editUserName").getValue(),
															password: $$("editUserPassword").getValue() == "" ? null : $$("editUserPassword").getValue(),
															email: $$("editUserEmail").getValue() == "" ? null : $$("editUserEmail").getValue(),
															comment: $$("editUserComment").getValue() == "" ? null : $$("editUserComment").getValue(),
														}

														webix.ajax().put("/api/users/" + id, JSON.stringify(user)).then((data) => {
															var message = data.json()

															webix.message({
																type: "success",
																expire: 10000,
																text: message
															})

															$$("usersTable").clearAll()
															$$("usersTable").load("/api/users")

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
					"passwordConfirm": (value) => {
						if ($$("editUserPassword").getValue() != "")
							return value === $$("editUserPassword").getValue()
						else return true
					},
					"email": webix.rules.isEmail,
					"name": webix.rules.isNotEmpty
				}
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			}, on: {
				onShow: () => {
					var id = this.getParam("id", true)
					this.webix.ajax().get("/api/users/" + id).then((data) => {
						var user = data.json()
						$$("editUserId").setValue(user.user_id)
						$$("editUserName").setValue(user.name)
						$$("editUserEmail").setValue(user.email)
						$$("editUserComment").setValue(user.comment)
					})
				},
				onHide: () => {
					$$("edit_user_form").clear()
					$$("edit_user_form").clearValidation()
				}
			}
		}
	}
	ready() {
		var editUserWindow = $$("edit_user_window")

		webix.UIManager.addHotKey("esc", function () {
			if (editUserWindow.isVisible())
				editUserWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}