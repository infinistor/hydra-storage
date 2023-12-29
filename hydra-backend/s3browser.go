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
package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"

	_ "github.com/go-sql-driver/mysql"
)

type S3SessionCredentials struct {
	AccessKey    string `json:"access_key" example:"923d1e023c7542ba4cdc"`
	AccessSecret string `json:"access_secret" example:"f712ab17ae4e7c53f754c936"`
	URL          string `json:"url" example:"http://192.168.11.229:8080"`
}

// @Summary Create S3 Session
// @Description Create S3 Session
// @Tags s3browser
// @Accept  json
// @Produce  json
// @Param credentials body S3SessionCredentials true "S3 Session Credentials"
// @Success 200 {string} string "Session created"
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/session [post]
func createS3BrowserSession(w http.ResponseWriter, r *http.Request) {
	// Get the credentials from the request
	decoder := json.NewDecoder(r.Body)
	var creds S3SessionCredentials
	err := decoder.Decode(&creds)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(creds.URL),
		Credentials: credentials.NewStaticCredentials(
			creds.AccessKey,
			creds.AccessSecret,
			""),
	},
	)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Create a new service client
	svc := s3.New(sess)

	// Check if the session is valid
	_, err = svc.ListBuckets(nil)

	if err != nil {
		format.JSON(w, http.StatusUnauthorized, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, creds)
}

// @Summary List Buckets
// @Description List Buckets
// @Tags s3browser
// @Produce  json
// @Param credentials body S3SessionCredentials true "S3 Session Credentials"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets [put]
func listBuckets(w http.ResponseWriter, r *http.Request) {
	// Get the credentials from the request
	decoder := json.NewDecoder(r.Body)
	var creds S3SessionCredentials
	err := decoder.Decode(&creds)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(creds.URL),
		Credentials: credentials.NewStaticCredentials(
			creds.AccessKey,
			creds.AccessSecret,
			""),
	},
	)
	// Create a new service client
	svc := s3.New(sess)

	// Get the list of buckets
	result, err := svc.ListBuckets(nil)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, result.Buckets)
}

type S3BucketObjectListRequest struct {
	Bucket      string               `json:"bucket" example:"bucket-1"`
	Prefix      string               `json:"prefix" example:"folder1/"`
	Credentials S3SessionCredentials `json:"credentials"`
}

// @Summary List Bucket Objects
// @Description List Bucket Objects
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketObjectListRequest true "S3 Bucket Object List Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/objects [put]
func listObjects(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var listObjectReq S3BucketObjectListRequest
	err := decoder.Decode(&listObjectReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(listObjectReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			listObjectReq.Credentials.AccessKey,
			listObjectReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	// Get list of objects
	resp, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket:    aws.String(`/` + listObjectReq.Bucket),
		Prefix:    aws.String(listObjectReq.Prefix),
		Delimiter: aws.String(``)})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var contents []*s3.Object
	prefixSubfolderNo := len(strings.Split(listObjectReq.Prefix, "/"))

	// Filter out the objects that are not in the given folder
	for _, item := range resp.Contents {
		name := *item.Key
		split := strings.Split(name, "/")
		if name == listObjectReq.Prefix {
			continue
		} else if len(split) == prefixSubfolderNo {
			contents = append(contents, item)
		} else if len(split) > prefixSubfolderNo {
			if split[len(split)-1] == "" && len(split) <= prefixSubfolderNo+1 {
				contents = append(contents, item)
			} else {
				continue
			}
		}
	}

	format.JSON(w, http.StatusOK, contents)
}

type S3BucketObjectRequest struct {
	Bucket      string               `json:"bucket" example:"bucket-1"`
	Filename    string               `json:"filename" example:"folder1/file1.txt"`
	Credentials S3SessionCredentials `json:"credentials"`
}

// @Summary Get Head Object
// @Description Get Head Object
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketObjectRequest true "S3 Bucket Object Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/headobject [put]
func getHeadObject(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var objectReq S3BucketObjectRequest
	err := decoder.Decode(&objectReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(objectReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			objectReq.Credentials.AccessKey,
			objectReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	properties, err := svc.HeadObject(&s3.HeadObjectInput{
		Bucket: aws.String("/" + objectReq.Bucket),
		Key:    aws.String(objectReq.Filename),
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Could not get head object")
		return
	}

	format.JSON(w, http.StatusOK, properties)
}

type S3BucketRequest struct {
	Bucket      string               `json:"bucket" example:"bucket-1"`
	Credentials S3SessionCredentials `json:"credentials"`
}

// @Summary Create New Bucket
// @Description Create New Bucket
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 New Bucket Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets [post]
func createBucket(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	_, err = svc.CreateBucket(&s3.CreateBucketInput{
		Bucket: aws.String(`/` + bucketReq.Bucket),
	})
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Unable to create bucket")
		return
	}

	err = svc.WaitUntilBucketExists(&s3.HeadBucketInput{
		Bucket: aws.String(`/` + bucketReq.Bucket),
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Error occurred while waiting for bucket to be created")
		return
	}

	format.JSON(w, http.StatusOK, "Bucket created")
}

// @Summary Delete Bucket
// @Description Delete Bucket
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Delete Bucket Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets [delete]
func deleteBucket(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	iter := s3manager.NewDeleteListIterator(svc, &s3.ListObjectsInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err := s3manager.NewBatchDeleteWithClient(svc).Delete(aws.BackgroundContext(), iter); err != nil {
		format.JSON(w, http.StatusInternalServerError, "Unable to delete all files from bucket")
		return
	}

	_, err = svc.DeleteBucket(&s3.DeleteBucketInput{
		Bucket: aws.String(`/` + bucketReq.Bucket),
	})
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Unable to delete bucket")
		return
	}

	err = svc.WaitUntilBucketNotExists(&s3.HeadBucketInput{
		Bucket: aws.String(`/` + bucketReq.Bucket),
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Error occurred while waiting for bucket to be deleted")
		return
	}

	format.JSON(w, http.StatusOK, "Bucket deleted")
}

// @Summary Create New Folder
// @Description Create New Folder
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketObjectRequest true "S3 New Folder Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/folders [post]
func createFolder(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var objectReq S3BucketObjectRequest
	err := decoder.Decode(&objectReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(objectReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			objectReq.Credentials.AccessKey,
			objectReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	req := &s3.PutObjectInput{
		Bucket: aws.String("/" + objectReq.Bucket),
		Key:    aws.String(objectReq.Filename),
	}

	_, err1 := svc.PutObject(req)
	if err1 != nil {
		format.JSON(w, http.StatusInternalServerError, "Could not create a folder")
		return
	}

	format.JSON(w, http.StatusOK, "Created a folder!")
}

// @Summary Upload File
// @Description Upload File
// @Tags s3browser
// @Produce  json
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/upload [post]
func uploadFile(w http.ResponseWriter, r *http.Request) {
	limit := Config.UploadLimit
	if limit < 1 {
		limit = int64(32 << 20)
	}

	// this one limit max upload size
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	r.ParseMultipartForm(limit)
	file, handler, err := r.FormFile("upload")
	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	folderName := r.Form.Get("folderName")
	bucketName := r.Form.Get("bucketName")
	url := r.Form.Get("url")
	accessKey := r.Form.Get("accessKey")
	accessSecret := r.Form.Get("accessSecret")

	defer file.Close()

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(url),
		Credentials: credentials.NewStaticCredentials(
			accessKey,
			accessSecret,
			""),
	},
	)

	uploader := s3manager.NewUploader(sess)

	_, err = uploader.Upload(&s3manager.UploadInput{
		Bucket: aws.String("/" + bucketName),
		Key:    aws.String(folderName + handler.Filename),
		Body:   file,
	})
	if err != nil {
		// Print the error and exit.
		format.JSON(w, http.StatusInternalServerError, "Unable to upload to bucket")
		return
	}

	format.JSON(w, http.StatusOK, handler.Filename)
}

// @Summary Download File
// @Description Download File
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketObjectRequest true "S3 Download File Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/download [post]
func downloadFile(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var objectReq S3BucketObjectRequest
	err := decoder.Decode(&objectReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(objectReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			objectReq.Credentials.AccessKey,
			objectReq.Credentials.AccessSecret,
			""),
	},
	)

	downloadName := strings.Split(objectReq.Filename, "/")
	fileNameFinal := downloadName[len(downloadName)-1]

	file, err := os.Create(fileNameFinal)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Could not create a file")
		return
	}

	defer file.Close()

	downloader := s3manager.NewDownloader(sess)

	_, err = downloader.Download(file,
		&s3.GetObjectInput{
			Bucket: aws.String("/" + objectReq.Bucket),
			Key:    aws.String(objectReq.Filename),
		})
	if err != nil {
		// Print the error and exit.
		format.JSON(w, http.StatusInternalServerError, "Unable to download from bucket")
		return
	}

	disposition := "attachment"
	w.Header().Set("Content-Disposition", disposition+"; filename=\""+fileNameFinal+"\"")
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeContent(w, r, fileNameFinal, time.Now(), file)

	format.JSON(w, http.StatusOK, objectReq.Filename)
}

// @Summary Delete File
// @Description Delete File
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketObjectRequest true "S3 Delete File Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/objects [delete]
func deleteFile(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var objectReq S3BucketObjectRequest
	err := decoder.Decode(&objectReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(objectReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			objectReq.Credentials.AccessKey,
			objectReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	_, err = svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String("/" + objectReq.Bucket),
		Key:    aws.String(objectReq.Filename),
	})
	if err != nil {
		format.Text(w, http.StatusInternalServerError, "Unable to delete from bucket")
		return
	}

	err = svc.WaitUntilObjectNotExists(&s3.HeadObjectInput{
		Bucket: aws.String("/" + objectReq.Bucket),
		Key:    aws.String(objectReq.Filename),
	})
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Error occurred while waiting for object to be deleted")
		return
	}

	format.JSON(w, http.StatusOK, "Deleted "+objectReq.Filename)
}

// @Summary Delete Folder
// @Description Delete Folder
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketObjectRequest true "S3 Delete Folder Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/folders [delete]
func deleteFolder(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var objectReq S3BucketObjectRequest
	err := decoder.Decode(&objectReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(objectReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			objectReq.Credentials.AccessKey,
			objectReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	iter := s3manager.NewDeleteListIterator(svc, &s3.ListObjectsInput{
		Bucket: aws.String("/" + objectReq.Bucket),
		Prefix: aws.String(objectReq.Filename),
	})

	if err := s3manager.NewBatchDeleteWithClient(svc).Delete(aws.BackgroundContext(), iter); err != nil {
		format.JSON(w, http.StatusInternalServerError, "Unable to delete objects from folder")
		return
	}

	format.JSON(w, http.StatusOK, "Deleted all objects")
}

// @Summary Get Bucket Encryption
// @Description Get Bucket Encryption
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/encryption [put]
func getBucketEncryption(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.GetBucketEncryption(&s3.GetBucketEncryptionInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.Text(w, http.StatusOK, "NoSuchEncryptionConfiguration")
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

// @Summary Encrypt Bucket SSE
// @Description Encrypt Bucket SSE
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket SSE Encryption Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/encryption-sse [post]
func encryptBucketSSE(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	defEnc := &s3.ServerSideEncryptionByDefault{
		SSEAlgorithm: aws.String(s3.ServerSideEncryptionAes256),
	}
	rule := &s3.ServerSideEncryptionRule{ApplyServerSideEncryptionByDefault: defEnc}
	rules := []*s3.ServerSideEncryptionRule{rule}
	serverConfig := &s3.ServerSideEncryptionConfiguration{Rules: rules}

	ok, err := svc.PutBucketEncryption(&s3.PutBucketEncryptionInput{
		Bucket:                            aws.String("/" + bucketReq.Bucket),
		ServerSideEncryptionConfiguration: serverConfig,
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

// @Summary Delete Bucket Encryption
// @Description Delete Bucket Encryption
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket Encryption Delete Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/encryption [delete]
func deleteBucketEncryption(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.DeleteBucketEncryption(&s3.DeleteBucketEncryptionInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

// @Summary Get Bucket ACL
// @Description Get Bucket ACL
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket ACL Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/acl [put]
func getBucketACL(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.GetBucketAcl(&s3.GetBucketAclInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.Text(w, http.StatusInternalServerError, err.Error())
	} else {
		format.JSON(w, http.StatusOK, ok)
	}
}

type ACL struct {
	Permission string `json:"permission" example:"FULL_CONTROL"`
	UserType   string `json:"userType" example:"Owner"`
}

type S3BucketACLRequest struct {
	Credentials S3SessionCredentials `json:"credentials"`
	Bucket      string               `json:"bucket"`
	ACL         []ACL                `json:"permissions"`
}

// @Summary Change Bucket ACL
// @Description Change Bucket ACL
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketACLRequest true "S3 Bucket ACL Change Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/acl [post]
func changeBucketACL(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketACLRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.GetBucketAcl(&s3.GetBucketAclInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.Text(w, http.StatusInternalServerError, err.Error())
		return
	}

	ownerID := *ok.Owner.ID

	var grants []*s3.Grant

	for _, element := range bucketReq.ACL {
		if (element != ACL{}) {
			permissionType := element.Permission
			var newGrant s3.Grant
			if element.UserType == "Owner" {
				newGrantee := s3.Grantee{Type: aws.String(s3.TypeCanonicalUser), ID: &ownerID}
				newGrant = s3.Grant{Grantee: &newGrantee, Permission: &permissionType}
			} else {
				newGrantee := s3.Grantee{Type: aws.String(s3.TypeGroup), URI: aws.String("http://acs.amazonaws.com/groups/global/" + element.UserType)}
				newGrant = s3.Grant{Grantee: &newGrantee, Permission: &permissionType}
			}
			grants = append(grants, &newGrant)
		}
	}

	params := s3.PutBucketAclInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
		AccessControlPolicy: &s3.AccessControlPolicy{
			Grants: grants,
		},
	}

	_, err = svc.PutBucketAcl(&params)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, "Granted Permissions Successfully")
}

// @Summary Get Bucket Lifecycle Rules
// @Description Get Bucket Lifecycle Rules
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket Lifecycle Rules Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/lifecycle [put]
func getBucketLifecycleRules(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.GetBucketLifecycleConfiguration(&s3.GetBucketLifecycleConfigurationInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.Text(w, http.StatusNoContent, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

type LifecycleRule struct {
	AbortIncompleteMultipartUpload int    `json:"AbortIncompleteMultipartUpload"`
	Expiration                     int    `json:"Expiration"`
	Prefix                         string `json:"Prefix"`
	Status                         int    `json:"Status"`
	Transitions                    []struct {
		Days         int    `json:"Days"`
		StorageClass string `json:"StorageClass"`
	} `json:"Transitions"`
}

type S3BucketLifecycleRequest struct {
	Credentials    S3SessionCredentials `json:"credentials"`
	Bucket         string               `json:"bucket"`
	LifecycleRules []LifecycleRule      `json:"rules"`
}

// @Summary Change Bucket Lifecycle Rules
// @Description Change Bucket Lifecycle Rules
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketLifecycleRequest true "S3 Bucket Lifecycle Rules Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/lifecycle [post]
func changeBucketLifecycleRules(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketLifecycleRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	var rules []*s3.LifecycleRule

	for _, element := range bucketReq.LifecycleRules {
		var status string
		if element.Status == 1 {
			status = "Enabled"
		} else {
			status = "Disabled"
		}

		var transitions []*s3.Transition
		// assign transitions
		for _, transition := range element.Transitions {
			if transition.StorageClass != "" {
				newTransition := s3.Transition{Days: aws.Int64(int64(transition.Days)), StorageClass: aws.String(transition.StorageClass)}
				transitions = append(transitions, &newTransition)
			}
		}

		// rule for expiration / abortUploads each
		var rule s3.LifecycleRule

		var expiration *s3.LifecycleExpiration
		if element.Expiration > -1 {
			expiration = &s3.LifecycleExpiration{
				Days: aws.Int64(int64(element.Expiration)),
			}
		} else {
			expiration = nil
		}

		var abortUploads *s3.AbortIncompleteMultipartUpload
		if element.AbortIncompleteMultipartUpload > -1 {
			abortUploads = &s3.AbortIncompleteMultipartUpload{
				DaysAfterInitiation: aws.Int64(int64(element.AbortIncompleteMultipartUpload)),
			}
		} else {
			abortUploads = nil
		}
		rule = s3.LifecycleRule{
			Expiration: expiration,
			Filter: &s3.LifecycleRuleFilter{
				Prefix: aws.String(element.Prefix),
			},
			Status:                         aws.String(status),
			Transitions:                    transitions,
			AbortIncompleteMultipartUpload: abortUploads,
		}
		rules = append(rules, &rule)
	}

	input := &s3.PutBucketLifecycleConfigurationInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
		LifecycleConfiguration: &s3.BucketLifecycleConfiguration{
			Rules: rules,
		},
	}

	result, err := svc.PutBucketLifecycleConfiguration(input)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, result)
}

// @Summary Delete Bucket Lifecycle Rules
// @Description Delete Bucket Lifecycle Rules
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/lifecycle [delete]
func deleteBucketLifecycleRules(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.DeleteBucketLifecycle(&s3.DeleteBucketLifecycleInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, "Error occurred while waiting for bucket lifecycle rules to be deleted")
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

// @Summary Get Bucket Lifecycle Rules
// @Description Get Bucket Lifecycle Rules
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/versioning [put]
func getBucketVersioning(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.GetBucketVersioning(&s3.GetBucketVersioningInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.Text(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

type S3BucketVersioningRequest struct {
	Credentials S3SessionCredentials `json:"credentials"`
	Bucket      string               `json:"bucket"`
	Status      string               `json:"status"`
}

// @Summary Set Bucket Versioning
// @Description Set Bucket Versioning
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketVersioningRequest true "S3 Bucket Versioning Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/versioning [post]
func changeBucketVersioning(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketVersioningRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	input := &s3.PutBucketVersioningInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
		VersioningConfiguration: &s3.VersioningConfiguration{
			Status: aws.String(bucketReq.Status),
		},
	}

	result, err := svc.PutBucketVersioning(input)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, result)
}

// @Summary Get Bucket Logging
// @Description Get Bucket Logging
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/logging [put]
func getBucketLogging(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.GetBucketLogging(&s3.GetBucketLoggingInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

type Logging struct {
	TargetBucket string `json:"target-bucket" example:"bucket-1"`
	TargetFolder string `json:"target-folder" example:"logs/"`
}

type S3BucketLoggingRequest struct {
	Credentials S3SessionCredentials `json:"credentials"`
	Bucket      string               `json:"bucket" example:"bucket-1"`
	Logging     Logging              `json:"logging"`
}

// @Summary Set Bucket Logging
// @Description Set Bucket Logging
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketLoggingRequest true "S3 Bucket Logging Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/logging [post]
func changeBucketLogging(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketLoggingRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	var logging *s3.LoggingEnabled

	if bucketReq.Logging != (Logging{}) {
		logging = &s3.LoggingEnabled{
			TargetBucket: &bucketReq.Logging.TargetBucket,
			TargetPrefix: &bucketReq.Logging.TargetFolder,
		}
	}

	input := &s3.PutBucketLoggingInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
		BucketLoggingStatus: &s3.BucketLoggingStatus{
			LoggingEnabled: logging,
		},
	}

	result, err := svc.PutBucketLogging(input)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, result)
}

// @Summary Get Bucket Tagging
// @Description Get Bucket Tagging
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketRequest true "S3 Bucket Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/tagging [put]
func getBucketTagging(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	ok, err := svc.GetBucketTagging(&s3.GetBucketTaggingInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
	})

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ok)
}

type Tag struct {
	Key   string `json:"Key"`
	Value string `json:"Value"`
}

type S3BucketTaggingRequest struct {
	Credentials S3SessionCredentials `json:"credentials"`
	Bucket      string               `json:"bucket" example:"bucket-1"`
	Tags        []Tag                `json:"tags"`
}

// @Summary Set Bucket Tagging
// @Description Set Bucket Tagging
// @Tags s3browser
// @Produce  json
// @Param credentials body S3BucketTaggingRequest true "S3 Bucket Tagging Request"
// @Success 200 {array} string
// @Failure 400 {string} string "Bad request"
// @Failure 500 {string} string "Internal server error"
// @Router /api/s3browser/buckets/tagging [post]
func changeBucketTagging(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var bucketReq S3BucketTaggingRequest
	err := decoder.Decode(&bucketReq)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Create a new session
	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String("us-west-2"),
		Endpoint: aws.String(bucketReq.Credentials.URL),
		Credentials: credentials.NewStaticCredentials(
			bucketReq.Credentials.AccessKey,
			bucketReq.Credentials.AccessSecret,
			""),
	},
	)

	// Create a new service client
	svc := s3.New(sess)

	var tagSet []*s3.Tag

	for _, tag := range bucketReq.Tags {
		key := tag.Key
		value := tag.Value
		tagSet = append(tagSet, &s3.Tag{
			Key:   &key,
			Value: &value,
		})
	}

	input := &s3.PutBucketTaggingInput{
		Bucket: aws.String("/" + bucketReq.Bucket),
		Tagging: &s3.Tagging{
			TagSet: tagSet,
		},
	}

	result, err := svc.PutBucketTagging(input)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, result)
}
