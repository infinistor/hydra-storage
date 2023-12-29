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

import { ajaxFail } from "../../functions/ajaxFail";

var s3browser_credentials
export default class Uploader extends JetView {
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
				}).fail((xhr) => {
					ajaxFail(xhr)
				})
			}
		}

		return {
			id: "fileUploader",
			view: "uploader",
			upload: "/api/s3browser/upload",
			formData: {
				bucketName: "",
				folderName: "",
			},
			on: {
				onBeforeFileAdd: function (data) {
					if ($$("bucket_list").getSelectedItem()) {
						$$("fileUploader").data.formData.bucketName = $$("bucket_list").getSelectedItem().Name
						$$("fileUploader").data.formData.folderName = $$("bucket_objects_toolbar").getChildViews()[2].getValue()
						$$("fileUploader").data.formData.url = s3browser_credentials.url
						$$("fileUploader").data.formData.accessKey = s3browser_credentials.access_key
						$$("fileUploader").data.formData.accessSecret = s3browser_credentials.access_secret
					} else {
						$$("fileUploader").define("autosend", false)
					}
				},
				onFileUpload: function () {
					if ($$("bucket_list").getSelectedItem()) {
						reloadBucketItems()
					}
				}
			},
			apiOnly: true
		}
	}
	init() {
		s3browser_credentials = webix.storage.session.get("s3browser_session")
	}
}