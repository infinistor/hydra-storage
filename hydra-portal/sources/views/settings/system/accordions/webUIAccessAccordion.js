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

export default class WebUIAccessAccordion extends JetView {
	config() {
		const labelWidth = 300
		const specialChars = ["~", "!", "@", "#", "$", "^", "&", "(", ")", "+", "[", "]", "{", "}", "*", ";", ":", ".", ",", "%", "|", "<", ">", "?", "/", "\\", "=", "-", "_"];

		return {
			borderless: true,
			rows: [
				{
					view: "form",
					id: "webUIAccessForm",
					elements: [
						{
							cols: [
								{
									width: 600,
									rows: [
										{
											view: "text", label: "HTTPS Port", value: "3030", labelWidth: labelWidth, disabled: true
										},
										{
											view: "text", label: "Allowed Network Addresses", value: "*", labelWidth: labelWidth, disabled: true
										},
										{
											view: "text", label: "Grafana IP Address", placeholder: "http://192.168.1.100:3000/d/hydra?orgId=1", labelWidth: labelWidth,
											id: "webUIGrafanaIP", name: "grafanaIP"
										},
										{
											view: "text", id: "webUIOldPassword", label: "Old Password", name: "oldPassword", type: "password", labelWidth: labelWidth, on: {
												onKeyPress: function (code, e) {
													return isKeyValidLatinOrNumber(code, e) || specialChars.includes(e.key)
												},
												onChange: function (newValue, oldValue) {
													if (newValue === "") {
														$$("webUIAccessForm").markInvalid("password", "Password cannot be empty")
													} else {
														$$("webUIAccessForm").markInvalid("password", false)
													}
												}
											}, invalidMessage: "Please enter your old password"
										},
										{
											view: "text", id: "webUIpassword", name: "password", type: "password", label: "New Password", labelWidth: labelWidth, on: {
												onKeyPress: function (code, e) {
													return isKeyValidLatinOrNumber(code, e) || specialChars.includes(e.key)
												},
												onChange: function (newValue, oldValue) {
													var numbers = /[0-9]+/
													if (newValue === "") {
														$$("webUIAccessForm").markInvalid("password", "Password cannot be empty")
													} else if (newValue.length < 8) {
														$$("webUIAccessForm").markInvalid("password", "Password must be at least 8 characters long")
													} else if (!numbers.test(newValue) || !specialChars.some(char => newValue.includes(char))) {
														$$("webUIAccessForm").markInvalid("password", "Password must contain at least one special character and number")
													} else {
														$$("webUIAccessForm").markInvalid("password", false)
													}
												}
											}, invalidMessage: "Password must be at least 8 characters long and contain at least one special character and number"
										},
										{
											view: "text", id: "webUIpasswordConfirm", name: "passwordConfirm", type: "password", label: "Confirm Password", labelWidth: labelWidth,
											invalidMessage: "Passwords do not match"
										},
										{ height: 10 },
										{
											view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
												if ($$("webUIAccessForm").validate()) {
													var json = {}

													if ($$("webUIOldPassword").getValue() !== "") {
														json["old_password"] = $$("webUIOldPassword").getValue()
														json["new_password"] = $$("webUIpassword").getValue()
													}

													if ($$("webUIGrafanaIP").getValue() !== "") {
														json["grafana_ip"] = $$("webUIGrafanaIP").getValue()
													}

													webix.ajax().post("/api/change-password", JSON.stringify(json)).then((data) => {
														var response = data.json()

														webix.message({
															type: "success",
															text: response,
															expire: 5000,
														})
													}).fail((xhr) => {
														ajaxFail(xhr)
													})

													// set password to empty
													$$("webUIAccessForm").clear()
													$$("webUIAccessForm").clearValidation()
												}
											}
										}
									]
								},
								{}
							]
						},
					],
					rules: {
						oldPassword: (value) => {
							if ($$("webUIpassword").getValue() != "") {
								if (value === "") {
									return false
								} else {
									return true
								}
							} else return true
						},
						password: (value) => {
							if ($$("webUIOldPassword").getValue() === "" && value === "") {
								if (this.$$("webUIGrafanaIP").getValue() === "") {
									return false
								} else {
									return true
								}
							}
							var numbers = /[0-9]+/
							if (value.length < 8) {
								return false
							} else if (!numbers.test(value) || !specialChars.some(char => value.includes(char))) {
								return false
							} else {
								return true
							}
						},
						passwordConfirm: (value) => {
							return value === $$("webUIpassword").getValue()
						},
					}
				}
			]
		}
	}
}