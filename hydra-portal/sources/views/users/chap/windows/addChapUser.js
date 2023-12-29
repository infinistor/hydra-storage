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
export default class AddCHAPUserWindow extends JetView {
	config() {
		const backend_url = this.app.config.backend_url

		const topBar = 48
		const labelWidth = 200

		const usernameSpecialChars = ["~", "!", "@", "#", "$", "^", "&", "(", ")", "+", "[", "]", "{", "}", "*", ";", ":", "'", "\"", ".", ",", "%", "|", "<", ">", "?", "/", "\\", "=", "`", " "];
		const passwordSpecialChars = [" ", "'", "\"", "`"];

		var chapNameAvailable = false

		function isCHAPNameAvailable(value) {
			webix.ajax().get("/api/chap-users/chap-user-id-taken/" + value).then((data) => {
				var chapIdTaken = data.json()
				if (chapIdTaken) {
					$$("add_chap_user_form").markInvalid("chapId", "CHAP ID is already taken")
					chapNameAvailable = false
				} else {
					$$("add_chap_user_form").markInvalid("chapId", false)
					chapNameAvailable = true
				}
			})
		}
		return {
			view: "window",
			id: "add_chap_user_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add CHAP User", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_chap_user_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", id: "addChapId", label: "CHAP ID", labelWidth: labelWidth, on: {
											onKeyPress: (code, e) => {
												if (usernameSpecialChars.includes(e.key)) {
													return false;
												} else {
													return true;
												}
											},
											onChange: (newVal, oldVal) => {
												if (newVal !== "") {
													isCHAPNameAvailable(newVal)
												} else {
													$$("add_chap_user_form").markInvalid("chapId", "CHAP ID cannot be empty")
												}
											}
										}, name: "chapId", invalidMessage: "CHAP ID cannot be empty"
									},
									{
										view: "text", id: "addChapUserPassword", label: "Password", labelWidth: labelWidth, type: "password", on: {
											onKeyPress: (code, e) => {
												if (passwordSpecialChars.includes(e.key)) {
													return false;
												} else {
													return true;
												}
											}, onChange: (newVal, oldVal) => {
												if (newVal.length == 0 || (newVal.length == 0 && oldVal.length == 0)) {
													$$("add_chap_user_form").markInvalid("password", "Password cannot be empty")
												} else if (newVal.length < 12) {
													$$("add_chap_user_form").markInvalid("password", "Password must be at least 12 characters")
												} else if (newVal.length > 16) {
													$$("add_chap_user_form").markInvalid("password", "Password must be at most 16 characters")
												} else {
													$$("add_chap_user_form").markInvalid("password", false)
												}
											}
										}, name: "password", invalidMessage: "Password cannot be empty and must be between 12 and 16 characters"
									},
									{
										view: "text", id: "addChapUserPasswordConfirm", label: "Password Confirm", labelWidth: labelWidth, type: "password", on: {
											onKeyPress: (code, e) => {
												if (passwordSpecialChars.includes(e.key)) {
													return false;
												} else {
													return true;
												}
											}, onChange: (newVal, oldVal) => {
												if (newVal == $$("addChapUserPassword").getValue()) {
													$$("add_chap_user_form").markInvalid("password_confirm", false)
												} else {
													$$("add_chap_user_form").markInvalid("password_confirm", "Passwords do not match")
												}
											}
										}, name: "password_confirm", invalidMessage: "Passwords do not match"
									},
									// {
									//     view: "text", label: "Comment", labelWidth: labelWidth, on: {
									//         onKeyPress: (code, e) => {
									//             if(commentSpecialChars.includes(e.key)) {
									//                 return false;
									//             } else {
									//                 return true;
									//             }
									//         }
									//     }
									// },
									{},
									{
										cols: [
											{
												view: "button", value: "Add", css: "new_style_primary", width: 70, click: () => {
													if ($$("addChapId").getValue() !== "") {
														isCHAPNameAvailable($$("addChapId").getValue())
													}
													if ($$("add_chap_user_form").validate() && chapNameAvailable) {
														var chap_user_post_json = {
															"chap_name": $$("add_chap_user_form").getValues().chapId,
															"password": $$("add_chap_user_form").getValues().password
														}

														webix.ajax().post("/api/chap-users", JSON.stringify(chap_user_post_json)).then((data) => {
															$$("chapUsersTable").clearAll()
															$$("chapUsersTable").load("/api/chap-users")

															webix.message({
																type: "success",
																expire: 10000,
																text: "CHAP User " + chap_user_post_json.chap_name + " added successfully"
															})
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
					chapId: webix.rules.isNotEmpty,
					password: (value) => {
						if (value.length < 12 || value.length > 16) {
							return false
						} else {
							return true
						}
					},
					password_confirm: (value) => {
						if (value == $$("addChapUserPassword").getValue()) {
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
					$$("add_chap_user_form").clear()
					$$("add_chap_user_form").clearValidation()
				}
			},
		}
	}
	ready() {
		var addCHAPWindow = $$("add_chap_user_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addCHAPWindow.isVisible())
				addCHAPWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}