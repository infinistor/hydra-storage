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
import { isKeyValidLatinOrNumber } from "../../../functions/validation";

var s3browser_credentials
export default class NewFolderWindow extends JetView {
	config() {
		function reloadBucketItems() {
			var selectedCell = $$("bucket_list").getSelectedItem().Name
			if (selectedCell) {
				var json = {
					credentials: s3browser_credentials,
					bucket: selectedCell,
					prefix: $$("bucket_objects_toolbar").getChildViews()[2].getValue()
				}
				webix.ajax().put("/api/s3browser/objects", JSON.stringify(json)).then(function (data) {
					$$("bucket_objects").clearAll()

					var json = data.json()

					var modules = []

					// Add ".." row if not in root directory
					if ($$("bucket_objects_toolbar").getChildViews()[2].getValue() != "") {
						modules.push({
							Key: ".."
						})
					}

					if (json) {
						for (var i = 0; i < json.length; i++) {
							modules.push({
								Key: [json[i].Key]
							})
						}
					}

					// Sort directories first and then files
					modules.sort(function (a, b) {
						if (a.Key[0][a.Key[0].length - 1] === "/" || b.Key[0][b.Key[0].length - 1] === "/") {
							if (a.Key[0].charCodeAt(a.Key[0].length - 1) > b.Key[0].charCodeAt(b.Key[0].length - 1)) {
								return 1
							}
							else if (a.Key[0].charCodeAt(a.Key[0].length - 1) < b.Key[0].charCodeAt(b.Key[0].length - 1)) {
								return -1
							} else {
								return 0
							}
						} else return 0
					})

					$$("bucket_objects").define("data", modules)
				})
			}
		}

		return {
			view: "window",
			id: "folder_window",
			position: "center",
			width: 300,
			move: true,
			head: {
				view: "toolbar",
				borderless: true,
				cols: [
					{ width: 4 },
					{ view: "label", label: "Add New Folder", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: () => {
							this.hideWindow()
						}
					}
				]
			},
			body: {
				borderless: true,
				paddingY: 10,
				paddingX: 10,
				rows: [
					{
						view: "form",
						padding: {
							bottom: 10, top: 0, left: 0, right: 0
						},
						id: "folder_name_field",
						borderless: true,
						elements: [
							{
								view: "text", label: "Name", name: "name", width: 250, labelWidth: 50, invalidMessage: "Folder name is required", on: {
									onKeyPress: (code, e) => {
										return isKeyValidLatinOrNumber(code, e) || code == 45 || code == 95
									}
								}
							}
						],
						rules: {
							name: webix.rules.isNotEmpty
						}
					},
					{
						view: "button", value: "Create", width: 70, css: "webix_primary", click: () => {
							if ($$("folder_name_field").validate()) {
								var json = {
									bucket: $$("bucket_list").getSelectedItem().Name,
									filename: $$("bucket_objects_toolbar").getChildViews()[2].getValue() + $$("folder_name_field").getValues().name + "/",
									credentials: s3browser_credentials
								}

								webix.ajax().post("/api/s3browser/folders/", JSON.stringify(json)).then(() => {
									reloadBucketItems()
								})

								this.hideWindow()
							}
						}
					},
				]
			},
			on: {
				onHide: () => {
					$$("folder_name_field").clear()
					$$("folder_name_field").clearValidation()
				}
			}
		}
	}
	init() {
		// get s3browser_session from session storage
		s3browser_credentials = webix.storage.session.get("s3browser_session")
	}
	showWindow() {
		$$("folder_window").show()
	}
	hideWindow() {
		$$("folder_window").hide()
	}
}