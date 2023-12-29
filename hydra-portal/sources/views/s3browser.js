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
import { JetView, plugins } from "webix-jet";
import NewBucketWindow from "./s3browser/windows/newBucketWindow"
import NewFolderWindow from "./s3browser/windows/newFolderWindow"
import Uploader from "./s3browser/uploader";
import BucketEncryptionWindow from "./s3browser/windows/bucketEncryptionWindow";
import BucketPermissionsWindow from "./s3browser/windows/bucketPermissionsWindow";
import BucketLifecycleWindow from "./s3browser/windows/bucketLifecycleWindow";
import BucketVersioningWindow from "./s3browser/windows/bucketVersioningWindow";
import BucketLoggingWindow from "./s3browser/windows/bucketLoggingWindow";
import BucketTagsWindow from "./s3browser/windows/bucketTagsWindow";

var s3browser_credentials
var newBucketWindow
var newFolderWindow
var bucketEncryptionWindow
var bucketPermissionsWindow
var bucketLifecycleWindow
var bucketVersioningWindow
var bucketLoggingWindow
var bucketTagsWindow

var selectBucket
export default class S3Browser extends JetView {
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
			cols: [
				{
					width: 300,
					rows: [
						{
							view: "toolbar",
							elements: [
								{
									view: "button", type: "icon", icon: "mdi mdi-plus", label: "New Bucket", width: 110, css: "webix_primary s3_browser", click: () => {
										newBucketWindow.showWindow()
									}
								},
								// { view: "button", type: "icon", icon: "mdi mdi-delete", css: "webix_danger s3_browser", width: 125, label: "Delete Bucket", click: () => {
								//     if($$("bucket_list").getSelectedItem()) {
								//         var selectedCell = $$("bucket_list").getSelectedItem().Name
								//         // warning message
								//         webix.confirm({
								//             title: "Delete Bucket",
								//             text: "Are you sure you want to delete this bucket?",
								// 	        type: "alert-warning",
								//             callback: function(result) {
								//                 if(result) {
								//                     var json = {
								//                         credentials: s3browser_credentials,
								//                         bucket: selectedCell
								//                     }
								//                     webix.ajax().del("/api/s3browser/buckets", JSON.stringify(json)).then(function(data) {
								//                         $$("bucket_list").remove($$("bucket_list").getSelectedId())
								//                     })
								//                 }
								//             }
								//         })
								//     }
								// } },
							]
						},
						{
							id: "bucket_list",
							localId: "buckets",
							view: "datatable",
							scroll: "y",
							header: false,
							minRowHeight: 30,
							columns: [
								{
									id: "Name", header: "Buckets", fillspace: true, template: function (obj) {
										var style = ' style="font-size: 20px !important; margin-right: 6px; color: #94A1B3;"'
										return '<span class="mdi mdi-folder"' + style + '></span><span>' + obj.Name + '</span>'
									}
								}
							],
							select: "cell",
							on: {
								onSelectChange: function () {
									if ($$("bucket_list").getSelectedItem()) {
										$$("bucket_objects_toolbar").getChildViews()[2].setValue("")
										// $$("properties").hide()
										reloadBucketItems()
									}
								},
								onBeforeContextMenu: function (id, e) {
									selectBucket = this.getItem(id)
								}
							},
							css: {
								"user-select": "none"
							},
							onContext: {}
						},
					]
				},
				{
					rows: [
						{
							view: "toolbar",
							id: "bucket_objects_toolbar",
							elements: [
								{
									view: "button", type: "icon", icon: "mdi mdi-plus", label: "New", width: 70, css: "s3_browser",
									popup: {
										view: "contextmenu",
										autowidth: true,
										data: [
											{ id: "folder", value: "Folder", icon: "mdi mdi-folder-plus-outline contextmenu_icon" },
											{ id: "file", value: "File", icon: "mdi mdi-file-document-plus-outline contextmenu_icon" }
										],
										on: {
											onMenuItemClick(id) {
												// check if any bucket is selected
												if ($$("bucket_list").getSelectedItem()) {
													if (id === "folder") {
														newFolderWindow.showWindow()
													} else if (id === "file") {
														$$("fileUploader").fileDialog()
													}
												}
											}
										}
									},
								},
								{ width: 10 },
								{ view: "label", },
								// logout button
								{
									view: "icon", icon: "mdi mdi-logout-variant", width: 30, click: () => {
										// delete s3browser_credentials
										s3browser_credentials = null
										webix.storage.session.remove('s3browser_session')
										// redirect to login page
										this.show("login")
									}
								}
							]
						},
						{
							id: "bucket_objects",
							localId: "body",
							view: "datatable",
							header: false,
							columns: [
								{
									id: "Key", header: "", fillspace: true,
									format: function (value) {
										if (value) {
											var newValue = value[0].split("/")
											var style = ' style="font-size: 20px !important; margin-right: 6px; color: #94A1B3;"'
											if (newValue.length > 1) {
												// folder
												if (newValue[newValue.length - 1] === "") {
													return '<span class="mdi mdi-folder"' + style + '></span>' + newValue[newValue.length - 2]
												}
												// file
												else {
													var fileFormat = newValue[newValue.length - 1].split(".")
													fileFormat = fileFormat[fileFormat.length - 1]

													var icon = ""
													if (fileFormat == "png" || fileFormat == "jpg" || fileFormat == "jpeg" || fileFormat == "gif") {
														icon += '<span class="mdi mdi-image-area"' + style + '></span>'
													} else if (fileFormat == "pdf") {
														icon += '<span class="mdi mdi-file-pdf-box"' + style + '></span>'
													} else if (fileFormat == "doc" || fileFormat == "docx") {
														icon += '<span class="mdi mdi-file-word"' + style + '></span>'
													} else if (fileFormat == "xls" || fileFormat == "xlsx") {
														icon += '<span class="mdi mdi-file-excel"' + style + '></span>'
													} else if (fileFormat == "ppt" || fileFormat == "pptx") {
														icon += '<span class="mdi mdi-file-powerpoint"' + style + '></span>'
													} else if (fileFormat == "txt") {
														icon += '<span class="mdi mdi-file-document"' + style + '></span>'
													} else if (fileFormat == "zip" || fileFormat == "rar") {
														icon += '<span class="mdi mdi-zip-box"' + style + '></span>'
													} else if (fileFormat == "mp3" || fileFormat == "wav" || fileFormat == "ogg") {
														icon += '<span class="mdi mdi-music"' + style + '></span>'
													} else if (fileFormat == "mp4" || fileFormat == "avi" || fileFormat == "mov" || fileFormat == "wmv") {
														icon += '<span class="mdi mdi-video"' + style + '></span>'
													} else if (fileFormat == "exe") {
														icon += '<span class="mdi mdi-application-cog"' + style + '></span>'
													} else {
														icon += '<span class="mdi mdi-file"' + style + '></span>'
													}
													return icon + newValue[newValue.length - 1]
												}
											} else {
												// go-back folder
												if (value == "..") {
													return '<span class="mdi mdi-folder"' + style + '></span>' + value
												}
												// file
												var fileFormat = newValue[newValue.length - 1].split(".")
												fileFormat = fileFormat[fileFormat.length - 1]
												var icon = ""
												if (fileFormat == "png" || fileFormat == "jpg" || fileFormat == "jpeg" || fileFormat == "gif") {
													icon += '<span class="mdi mdi-image-area"' + style + '></span>'
												} else if (fileFormat == "pdf") {
													icon += '<span class="mdi mdi-file-pdf-box"' + style + '></span>'
												} else if (fileFormat == "doc" || fileFormat == "docx") {
													icon += '<span class="mdi mdi-file-word"' + style + '></span>'
												} else if (fileFormat == "xls" || fileFormat == "xlsx") {
													icon += '<span class="mdi mdi-file-excel"' + style + '></span>'
												} else if (fileFormat == "ppt" || fileFormat == "pptx") {
													icon += '<span class="mdi mdi-file-powerpoint"' + style + '></span>'
												} else if (fileFormat == "txt") {
													icon += '<span class="mdi mdi-file-document"' + style + '></span>'
												} else if (fileFormat == "zip" || fileFormat == "rar") {
													icon += '<span class="mdi mdi-zip-box"' + style + '></span>'
												} else if (fileFormat == "mp3" || fileFormat == "wav" || fileFormat == "ogg") {
													icon += '<span class="mdi mdi-music"' + style + '></span>'
												} else if (fileFormat == "mp4" || fileFormat == "avi" || fileFormat == "mov" || fileFormat == "wmv") {
													icon += '<span class="mdi mdi-video"' + style + '></span>'
												} else if (fileFormat == "exe") {
													icon += '<span class="mdi mdi-application"' + style + '></span>'
												} else {
													icon += '<span class="mdi mdi-file"' + style + '></span>'
												}
												return icon + newValue[newValue.length - 1]
											}
										} else return null
									}
								}
							],
							select: "row",
							scroll: "y",
							css: {
								"user-select": "none"
							},
							on: {
								onItemDblClick: function () {
									var selectedObjectSplit = ($$("bucket_objects").getSelectedItem().Key[0]).split("/")
									// if selected object is a folder
									if (selectedObjectSplit[selectedObjectSplit.length - 1] === "") {
										$$("bucket_objects_toolbar").getChildViews()[2].setValue("" + $$("bucket_objects").getSelectedItem().Key)

										if ($$("bucket_list").getSelectedItem()) {
											if ($$("bucket_objects").getSelectedItem()) {
												reloadBucketItems()
											}
										}

										// hide properties
										$$("properties").hide()
									}
									// if selected object is a "go up a directory"
									else if ($$("bucket_objects").getSelectedItem().Key === "..") {
										var folderPath = ($$("bucket_objects_toolbar").getChildViews()[2].getValue()).split("/")
										if (folderPath.length < 3) {
											$$("bucket_objects_toolbar").getChildViews()[2].setValue("")
										} else {
											folderPath = folderPath.slice(0, folderPath.length - 2)
											var headerValue = ""
											folderPath.forEach(function (value) {
												headerValue += value + "/"
											})
											$$("bucket_objects_toolbar").getChildViews()[2].setValue(headerValue)
										}

										if ($$("bucket_list").getSelectedItem()) {
											if ($$("bucket_objects").getSelectedItem()) {
												reloadBucketItems()
											}
										}
									}
								},
								onItemClick: function (id) {
									var objectName = $$("bucket_objects").getSelectedItem().Key[0]
									// check if file and not going up a directory ("..")
									if (objectName !== ".") {
										var filename = this.getItem(id).Key[0]
										var json = {
											credentials: s3browser_credentials,
											bucket: $$("bucket_list").getSelectedItem().Name,
											filename: filename
										}

										webix.ajax().put("/api/s3browser/headobject", JSON.stringify(json)).then(function (data) {
											var json = data.json()
											var properties = $$("properties")
											var height = 25 + 5 * 24
											properties.setValues({
												version_id: json.VersionId,
												content_length: json.ContentLength,
												content_type: json.ContentType,
												etag: json.ETag,
												last_modified: new Date(json.LastModified),
												cache_control: json.CacheControl,
												delete_marker: json.DeleteMarker,
												expires: json.Expires,
												metadata: json.Metadata,
												object_lock_legal_hold_status: json.ObjectLockLegalHoldStatus,
												object_lock_mode: json.ObjectLockMode,
												object_lock_retain_until_date: json.ObjectLockRetainUntilDate,
												sse_customer_algorithm: json.SSECustomerAlgorithm,
												sse_customer_key_md5: json.SSECustomerKeyMD5,
												server_side_encryption: json.ServerSideEncryption,
												storage_class: json.StorageClass
											})
											if (json.CacheControl) {
												properties.getItem("cache_control").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("cache_control").css = { "display": "none" }
											}
											if (json.DeleteMarker) {
												properties.getItem("delete_marker").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("delete_marker").css = { "display": "none" }
											}
											if (json.Expires) {
												properties.getItem("expires").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("expires").css = { "display": "none" }
											}
											if (json.Metadata) {
												height += 24
												properties.getItem("metadata").css = { "display": "block" }
											} else {
												properties.getItem("metadata").css = { "display": "none" }
											}
											if (json.ObjectLockLegalHoldStatus) {
												properties.getItem("object_lock_legal_hold_status").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("object_lock_legal_hold_status").css = { "display": "none" }
											}
											if (json.ObjectLockMode) {
												properties.getItem("object_lock_mode").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("object_lock_mode").css = { "display": "none" }
											}
											if (json.ObjectLockRetainUntilDate) {
												properties.getItem("object_lock_retain_until_date").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("object_lock_retain_until_date").css = { "display": "none" }
											}
											if (json.SSECustomerAlgorithm) {
												properties.getItem("sse_customer_algorithm").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("sse_customer_algorithm").css = { "display": "none" }
											}
											if (json.SSECustomerKeyMD5) {
												properties.getItem("sse_customer_key_md5").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("sse_customer_key_md5").css = { "display": "none" }
											}
											if (json.ServerSideEncryption) {
												properties.getItem("server_side_encryption").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("server_side_encryption").css = { "display": "none" }
											}
											if (json.StorageClass) {
												properties.getItem("storage_class").css = { "display": "block" }
												height += 24
											} else {
												properties.getItem("storage_class").css = { "display": "none" }
											}
											properties.define("height", height)
											properties.resize()
											properties.show()
										})
									} else {
										$$("properties").hide()
									}
								},
								onBeforeContextMenu: function (id) {
									var item = this.getItem(id)
									var objectName = item.Key[0]
									// check if file and not going up a directory ("..")
									if (objectName !== "." && objectName !== "..") {
										this.select(id)
									} else {
										return false
									}
								}
							},

						},
						{
							autoheight: true,
							padding: 0,
							rows: [
								{
									view: "property",
									id: "properties",
									editable: false,
									nameWidth: 250,
									hidden: true,
									tooltip: function (obj) {
										if (obj.label === "Metadata") {
											var element = ""
											for (let x in obj.value) {
												element += "<span class='webix_strong'>" + x + ": </span>" + "<span class='webix_strong'>" + obj.value[x] + "</span><br/>"
											}
											return element
										} else {
											return ""
										}
									},
									elements: [
										{ label: "Headers", type: "label", id: "header" },
										{ label: "Cache Control", type: "text", id: "cache_control" },
										{ label: "Content Length", type: "text", id: "content_length" },
										{ label: "Content Type", type: "text", id: "content_type" },
										{ label: "Delete Marker", type: "text", id: "delete_marker" },
										{ label: "ETag", type: "text", id: "etag" },
										{ label: "Last Modified", type: "text", id: "last_modified" },
										{ label: "Expires", type: "text", id: "expires" },
										{
											label: "Metadata", type: "text", id: "metadata", height: 64,
											format: function (value) {
												var element = ""
												for (let x in value) {
													element += x + ": " + value[x] + " / "
												}
												return element
											}
										},
										{ label: "Object Lock Legal Hold Status", type: "text", id: "object_lock_legal_hold_status" },
										{ label: "Object Lock Mode", type: "text", id: "object_lock_mode" },
										{ label: "Object Lock Retain Until Date", type: "text", id: "object_lock_retain_until_date" },
										{ label: "SSE Customer Algorithm", type: "text", id: "sse_customer_algorithm" },
										{ label: "SSE Customer Key MD5", type: "text", id: "sse_customer_key_md5" },
										{ label: "Server Side Encryption", type: "text", id: "server_side_encryption" },
										{ label: "Storage Class", type: "text", id: "storage_class" },
										{ label: "Version Id", type: "text", id: "version_id" }
									]
								}
							]
						}
					]
				}
			]
		}
	}
	init() {
		// get s3browser_session from session storage
		s3browser_credentials = webix.storage.session.get("s3browser_session")
		// if s3browser_session is not set, redirect to login page
		if (!s3browser_credentials) {
			webix.message("Please login first")
			this.show("/login")
		} else {
			// load buckets
			$$("bucket_list").load(function () {
				return webix.ajax().put("/api/s3browser/buckets", JSON.stringify(s3browser_credentials))
			})

			// new bucket window
			newBucketWindow = this.ui(NewBucketWindow)
			// new folder window
			newFolderWindow = this.ui(NewFolderWindow)
			// bucket encryption window
			bucketEncryptionWindow = this.ui(BucketEncryptionWindow)
			// bucket permissions window
			bucketPermissionsWindow = this.ui(BucketPermissionsWindow)
			// bucket lifecycle window
			bucketLifecycleWindow = this.ui(BucketLifecycleWindow)
			// bucket versioning window
			bucketVersioningWindow = this.ui(BucketVersioningWindow)
			// bucket logging window
			bucketLoggingWindow = this.ui(BucketLoggingWindow)
			// bucket tags window
			bucketTagsWindow = this.ui(BucketTagsWindow)

			// invisible uploader
			this.ui(Uploader)

			var bucketObjectContextMenu = this.ui({
				view: "contextmenu",
				localId: "bucketObjectContextMenu",
				autowidth: true,
				data: [
					{ id: "permissions", value: "Edit Permissions (ACL)", icon: "mdi mdi-account-multiple-outline contextmenu_icon" },
					// separator
					{ $template: "Separator" },
					{ id: "download", value: "Download", icon: "mdi mdi-download contextmenu_icon" },
					{ id: "delete", value: "Delete", icon: "mdi mdi-delete contextmenu_icon" },
				],
				on: {
					onItemClick: (id) => {
						var selectedCell = $$("bucket_objects").getSelectedItem().Key[0]

						var bucket = $$("bucket_list").getSelectedItem().Name

						//check if folder
						if (selectedCell.endsWith("/")) {
							if (id == "download") {
								webix.message("Cannot download a folder")
							} else if (id == "delete") {
								webix.confirm({
									title: "Delete folder",
									text: "Are you sure you want to delete this folder?",
									callback: function (result) {
										if (result) {
											var json = {
												credentials: s3browser_credentials,
												bucket: bucket,
												filename: selectedCell
											}

											webix.ajax().del("/api/s3browser/folders", JSON.stringify(json)).then(function (data) {
												if (data.json() == "Deleted all objects") {
													// remove row from table
													$$("bucket_objects").remove($$("bucket_objects").getSelectedId())
												} else {
													webix.message(data.json())
												}
											})
										}
									}
								})
							}
						} else {
							if (id == "download") {
								webix.ajax().response("blob").post("/api/s3browser/download", JSON.stringify({
									credentials: s3browser_credentials,
									bucket: bucket,
									filename: selectedCell
								})).then(function (data) {
									selectedCell = selectedCell.split("/").pop()
									webix.html.download(data, selectedCell)
								})
							} else if (id == "delete") {
								webix.confirm({
									title: "Delete file",
									text: "Are you sure you want to delete this file?",
									callback: function (result) {
										if (result) {
											var json = {
												credentials: s3browser_credentials,
												bucket: bucket,
												filename: selectedCell
											}

											// remove row from table if successful
											// if error, show message
											webix.ajax().del("/api/s3browser/objects", JSON.stringify(json)).then(function (data) {
												if (data.json().startsWith("Deleted")) {
													// remove row from table
													$$("bucket_objects").remove($$("bucket_objects").getSelectedId())
												} else {
													webix.message(data.json())
												}
											})
										}
									}
								})
							}
						}
					}
				}
			})
			bucketObjectContextMenu.attachTo(this.$$("body").getNode())

			var bucketContextMenu = this.ui({
				view: "contextmenu",
				localId: "bucketContextMenu",
				autowidth: true,
				data: [
					{ id: "encryption", value: "Default Encryption Configuration...", icon: "mdi mdi-lock-plus-outline contextmenu_icon" },
					{ id: "permissions", value: "Edit Permissions (ACL)", icon: "mdi mdi-account-multiple-outline contextmenu_icon" },
					{ id: "lifecycle", value: "Lifecycle Configuration...", icon: "mdi mdi-calendar-clock contextmenu_icon" },
					{ id: "tags", value: "Edit Tags...", icon: "mdi mdi-tag-multiple contextmenu_icon" },
					{ id: "versioning", value: "Edit Versioning Settings...", icon: "mdi mdi-history contextmenu_icon" },
					{ id: "logging", value: "Edit Logging Settings...", icon: "mdi mdi-file-document-edit-outline contextmenu_icon" },
					// separator
					{ $template: "Separator" },
					{ id: "delete", value: "Delete", icon: "mdi mdi-delete contextmenu_icon" },
				],
				on: {
					onItemClick: (id) => {
						this.setParam("bucketName", selectBucket.Name, false)

						if (id === "encryption") {
							bucketEncryptionWindow.showWindow()
						} else if (id === "permissions") {
							bucketPermissionsWindow.showWindow()
						} else if (id === "lifecycle") {
							bucketLifecycleWindow.showWindow()
						} else if (id === "versioning") {
							bucketVersioningWindow.showWindow()
						} else if (id === "logging") {
							bucketLoggingWindow.showWindow()
						} else if (id === "tags") {
							bucketTagsWindow.showWindow()
						}
						else if (id === "delete") {
							// warning message
							webix.confirm({
								title: "Delete Bucket",
								text: "Are you sure you want to delete this bucket?",
								type: "alert-warning",
								callback: function (result) {
									if (result) {
										var json = {
											credentials: s3browser_credentials,
											bucket: selectBucket.Name
										}
										webix.ajax().del("/api/s3browser/buckets", JSON.stringify(json)).then(function (data) {
											$$("bucket_list").remove(selectBucket.id)
										})
									}
								}
							})
						}
					}
				}
			})
			bucketContextMenu.attachTo(this.$$("buckets").getNode())
		}
	}
}