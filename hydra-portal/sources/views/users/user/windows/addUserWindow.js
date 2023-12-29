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
export default class AddUserWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		const specialChars = ["~", "!", "@", "#", "$", "^", "&", "(", ")", "+", "[", "]", "{", "}", "*", ";", ":", ".", ",", "%", "|", "<", ">", "?", "/", "\\", "=", "-", "_"];
		const passwordSpecialChars = [" ", "'", "\"", "`"];

		var userNameAvailable = false

		function isUserNameAvailable(value) {
			webix.ajax().get("/api/users/user-id-taken/" + value).then((data) => {
				var userIdTaken = data.json()
				if (userIdTaken) {
					$$("add_user_form").markInvalid("userId", "User ID is already taken")
					userNameAvailable = false
				} else {
					$$("add_user_form").markInvalid("userId", false)
					userNameAvailable = true
				}
			})
		}
		return {
			view: "window",
			id: "add_user_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add User", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_user_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", label: "User ID", id: "addUserId", name: "userId", labelWidth: labelWidth, invalidMessage: "User ID must be between 4 and 255 characters long", on: {
											onChange: function (newValue, oldValue) {
												if (newValue !== "") {
													if (!isNaN(newValue[0]) || specialChars.includes(newValue[0])) {
														$$("add_user_form").markInvalid("userId", "User ID must start with a letter")
														userNameAvailable = false
													} else {
														isUserNameAvailable(newValue)
													}
												} else {
													$$("add_user_form").markInvalid("userId", "User ID cannot be empty")
												}
											},
											onKeyPress: (code, e) => {
												return isKeyValidLatinOrNumber(code, e) || code == 45 || code == 95
											},
										}
									},
									{
										view: "text", label: "User Name", id: "addUserName", name: "userName", labelWidth: labelWidth, invalidMessage: "User Name is required", on: {
											onKeyPress: (code, e) => {
												return isKeyValidLatinOrNumber(code, e) || code == 45 || code == 95
											},
											onChange: function (newValue, oldValue) {
												if (newValue === "") {
													$$("add_user_form").markInvalid("userName", "User Name cannot be empty")
												} else {
													$$("add_user_form").markInvalid("userName", false)
												}
											}
										}
									},
									{
										view: "text", label: "Password", id: "addUserPassword", name: "userPassword", type: "password", labelWidth: labelWidth, invalidMessage: "Password must be at least 8 characters long, and contain at least one special character and number", on: {
											onKeyPress: (code, e) => {
												return isKeyValidLatinOrNumber(code, e) || specialChars.includes(e.key)
											},
											onChange: function (newValue, oldValue) {
												var numbers = /[0-9]+/
												if (newValue === "") {
													$$("add_user_form").markInvalid("userPassword", "Password cannot be empty")
												} else if (newValue.length < 8) {
													$$("add_user_form").markInvalid("userPassword", "Password must be at least 8 characters long")
												} else if (!numbers.test(newValue) || !specialChars.some(char => newValue.includes(char))) {
													$$("add_user_form").markInvalid("userPassword", "Password must contain at least one special character and number")
												} else {
													$$("add_user_form").markInvalid("userPassword", false)
												}
											}
										}
									},
									{
										view: "text", label: "Password Confirm", id: "addUserPasswordConfirm", name: "passwordConfirm", type: "password", labelWidth: labelWidth, invalidMessage: "Password is not matched", on: {
											onKeyPress: (code, e) => {
												return isKeyValidLatinOrNumber(code, e) || !passwordSpecialChars.includes(e.key)
											},
											onChange: function (newValue, oldValue) {
												if (newValue === $$("addUserPassword").getValue()) {
													$$("add_user_form").markInvalid("passwordConfirm", false)
												} else {
													$$("add_user_form").markInvalid("passwordConfirm", "Passwords do not match")
												}
											}
										}
									},
									{
										view: "text", label: "Email", id: "addUserEmail", name: "userEmail", type: "email", labelWidth: labelWidth, invalidMessage: "Email is not valid", on: {
											onChange() {
												$$("add_user_form").validate()
											},
										}
									},
									{
										view: "text", name: "comment", label: "Comment", id: "addUserComment", labelWidth: labelWidth
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Add", css: "new_style_primary", width: 70, click: () => {
													if ($$("addUserId").getValue() !== "") {
														isUserNameAvailable($$("addUserId").getValue())
													}
													if ($$("add_user_form").validate() && userNameAvailable) {
														var user_json = {
															"user_id": $$("addUserId").getValue(),
															"name": $$("addUserName").getValue(),
															"password": $$("addUserPassword").getValue(),
															"email": $$("addUserEmail").getValue(),
															"comment": $$("addUserComment").getValue()
														}

														webix.ajax().post("/api/users", JSON.stringify(user_json)).then((data) => {
															var message = data.json()

															$$("usersTable").clearAll()
															$$("usersTable").load("/api/users")

															this.hideWindow()
															webix.message({ type: "success", text: message, expire: 10000 })
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
					"userId": (value) => {
						// user ID must be between 4 and 255 characters long
						if (value.length >= 4 && value.length <= 255) {
							return true
						} else {
							return false
						}
					},
					"userName": webix.rules.isNotEmpty,
					"userEmail": webix.rules.isEmail,
					"userPassword": (value) => {
						// password muct be at least 8 characters long
						// password muct contain at least one special character and one 
						var numbers = /[0-9]+/
						if (value.length < 8) {
							return false
						} else if (!numbers.test(value) || !specialChars.some(char => value.includes(char))) {
							return false
						} else {
							return true
						}
					},
					"passwordConfirm": (value) => {
						if (value === $$("addUserPassword").getValue())
							return true
						else
							return false
					},
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
					$$("add_user_form").clear()
					$$("add_user_form").clearValidation()
				}
			}

		}
	}
	ready() {
		var addUserWindow = $$("add_user_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addUserWindow.isVisible())
				addUserWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}