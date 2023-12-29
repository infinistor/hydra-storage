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
export default class AddS3CredentialsWindow extends JetView {
	config() {
		const accessKeyallowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
		const secretKeyallowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

		const topBar = 48
		const labelWidth = 200
		var user_id
		return {
			view: "window",
			id: "add_s3_credentials_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add S3 Credentails", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_s3_credentials_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										cols: [
											{ view: "label", label: "S3 Credentials", labelWidth: labelWidth },
											{},
											{
												view: "button", value: "Generate", css: "check-button-style", width: 100, click: () => {
													webix.ajax().get("/api/users/s3-credentials").then((data) => {
														var credentials = data.json()

														$$("s3accesskey").setValue(credentials.access_key)
														$$("s3secretkey").setValue(credentials.secret_key)
													})
												}
											}

										]
									},
									{
										padding: {
											left: 17, right: 0, top: 0, bottom: 0
										},
										rows: [
											{
												view: "text", id: "s3accesskey", label: "Access Key", name: "accessKey", labelWidth: labelWidth - 17, on: {
													onKeyPress: (code, e) => {
														if (accessKeyallowedChars.indexOf(e.key) == -1) {
															return false
														}
													},
													onChange(newv, oldv) {
														if (newv.length != 20) {
															$$("add_s3_credentials_form").markInvalid("accessKey", "Access Key must be 20 characters long")
														} else {
															$$("add_s3_credentials_form").markInvalid("accessKey", false)
														}
													}
												}, invalidMessage: "Access Key must be 20 characters long"
											},
											{
												view: "text", id: "s3secretkey", label: "Access Secret Key", name: "secretKey", labelWidth: labelWidth - 17, type: "password", on: {
													onKeyPress: (code, e) => {
														if (secretKeyallowedChars.indexOf(e.key) == -1) {
															return false
														}
													},
													onChange(newv, oldv) {
														if (newv.length != 40) {
															$$("add_s3_credentials_form").markInvalid("secretKey", "Access Secret Key must be 40 characters long")
														} else {
															$$("add_s3_credentials_form").markInvalid("secretKey", false)
														}
													}
												}, invalidMessage: "Access Secret Key must be 40 characters long"
											}
										]
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Add", css: "new_style_primary", width: 70, click: () => {
													if ($$("add_s3_credentials_form").validate()) {
														var s3_credentials_json = {
															"access_key": $$("s3accesskey").getValue(),
															"secret_key": $$("s3secretkey").getValue()
														}

														webix.ajax().post("/api/users/" + user_id + "/s3-credentials", JSON.stringify(s3_credentials_json)).then((data) => {
															var message = data.json()

															var S3CredTable = $$("usersTable").getSubView(user_id).getChildViews()[2]

															S3CredTable.clearAll()
															S3CredTable.load("/api/users/" + user_id + "/s3-credentials").then(function () {
																$$("usersTable").resizeSubView(user_id)
															})
															webix.message({ type: "success", text: message, expire: 10000 })
															this.hideWindow()
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
													}
												}
											},
											{
												view: "button", css: "new_style_button", value: "Cancel", width: 70, click: () => {
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
					"accessKey": (value) => {
						if (value.length != 20) {
							return false
						} else {
							return true
						}
					},
					"secretKey": (value) => {
						if (value.length != 40) {
							return false
						} else {
							return true
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
					user_id = this.getParam("id", true)

					// clear fields
					$$("s3accesskey").setValue("")
					$$("s3secretkey").setValue("")
				}
			}
		}
	}
	ready() {
		var addUserWindow = $$("add_s3_credentials_window")

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