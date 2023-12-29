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
export default class EditCHAPUserWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200
		const passwordSpecialChars = [" ", "'", "\"", "`"];
		return {
			view: "window",
			id: "edit_chap_user_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Edit CHAP User", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "edit_chap_user_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", id: "editChapUserChapName", label: "CHAP ID", labelWidth: labelWidth, readonly: true
									},
									{
										view: "text", id: "editChapUserChapPassword", label: "Password", labelWidth: labelWidth, type: "password", on: {
											onKeyPress: (code, e) => {
												if (passwordSpecialChars.includes(e.key)) {
													return false;
												} else {
													return true;
												}
											}, onChange: (newVal, oldVal) => {
												if (newVal.length == 0 || (newVal.length == 0 && oldVal.length == 0)) {
													$$("edit_chap_user_form").markInvalid("password", "Password cannot be empty")
												} else if (newVal.length < 12) {
													$$("edit_chap_user_form").markInvalid("password", "Password must be at least 12 characters")
												} else if (newVal.length > 16) {
													$$("edit_chap_user_form").markInvalid("password", "Password must be at most 16 characters")
												} else {
													$$("edit_chap_user_form").markInvalid("password", false)
												}
											}
										}, name: "password", invalidMessage: "Password cannot be empty and must be between 12 and 16 characters"
									},
									{
										view: "text", label: "Password Confirm", labelWidth: labelWidth, type: "password", on: {
											onKeyPress: (code, e) => {
												if (passwordSpecialChars.includes(e.key)) {
													return false;
												} else {
													return true;
												}
											}, onChange: (newVal, oldVal) => {
												if (newVal == $$("editChapUserChapPassword").getValue()) {
													$$("edit_chap_user_form").markInvalid("password_confirm", false)
												} else {
													$$("edit_chap_user_form").markInvalid("password_confirm", "Passwords do not match")
												}
											}
										}, name: "password_confirm", invalidMessage: "Passwords do not match"
									},
									// {
									//     view: "text", label: "Comment", value: "...............", labelWidth: labelWidth
									// },
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													if ($$("edit_chap_user_form").validate()) {
														var char_user_id = this.getParam("id", true)
														var password = $$("edit_chap_user_form").getValues().password

														webix.ajax().put("/api/chap-users/" + char_user_id, JSON.stringify(password)).then(function () {
															$$("chapUsersTable").clearAll()
															$$("chapUsersTable").load("/api/chap-users")

															webix.message({
																type: "success",
																expire: 10000,
																text: "CHAP user updated"
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
					password: (value) => {
						if (value.length < 12 || value.length > 16) {
							return false
						} else {
							return true
						}
					},
					password_confirm: (value) => {
						if (value == $$("editChapUserChapPassword").getValue()) {
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
				onShow: () => {
					var chap_user_id = this.getParam("id", true)

					webix.ajax().get("/api/chap-users/" + chap_user_id).then(function (data) {
						var chap_user = data.json()
						$$("editChapUserChapName").setValue(chap_user.chap_name)
					})
				},
				onHide: () => {
					$$("edit_chap_user_form").clear()
					$$("edit_chap_user_form").clearValidation()
				}
			}
		}
	}
	ready() {
		var addGroupWindow = $$("edit_chap_user_window")

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