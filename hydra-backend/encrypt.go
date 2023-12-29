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
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
)

func Ase256Encode(plaintext string, key string, iv string, blockSize int) string {
	bKey := []byte(key)
	bIV := []byte(iv)
	bPlaintext := PKCS5Padding([]byte(plaintext), blockSize, len(plaintext))
	block, err := aes.NewCipher(bKey)
	if err != nil {
		panic(err)
	}
	ciphertext := make([]byte, len(bPlaintext))
	mode := cipher.NewCBCEncrypter(block, bIV)
	mode.CryptBlocks(ciphertext, bPlaintext)
	return hex.EncodeToString(ciphertext)
}

func Ase256Decode(cipherText string, encKey string, iv string) (decryptedString string) {
	bKey := []byte(encKey)
	bIV := []byte(iv)
	cipherTextDecoded, err := hex.DecodeString(cipherText)
	if err != nil {
		panic(err)
	}

	block, err := aes.NewCipher(bKey)
	if err != nil {
		panic(err)
	}

	mode := cipher.NewCBCDecrypter(block, bIV)
	mode.CryptBlocks([]byte(cipherTextDecoded), []byte(cipherTextDecoded))
	return string(cipherTextDecoded)
}

func PKCS5Padding(ciphertext []byte, blockSize int, after int) []byte {
	padding := (blockSize - len(ciphertext)%blockSize)
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

func encryptString(text string) string {
	key := strings.ReplaceAll(os.Getenv("ENCRYPT_KEY"), " ", "")
	iv := strings.ReplaceAll(os.Getenv("ENCRYPT_IV"), " ", "")
	fmt.Println("key: " + key)
	fmt.Println("iv: " + iv)
	encryptedString := Ase256Encode(text, key, iv, aes.BlockSize)
	// remove all characters that are > 127
	encryptedString = strings.Map(func(r rune) rune {
		if r > 127 || r < 32 {
			return -1
		}
		return r
	}, encryptedString)
	return encryptedString
}

func decryptString(text string) string {
	key := strings.ReplaceAll(os.Getenv("ENCRYPT_KEY"), " ", "")
	iv := strings.ReplaceAll(os.Getenv("ENCRYPT_IV"), " ", "")
	decryptedString := Ase256Decode(text, key, iv)
	// remove all characters that are > 127
	decryptedString = strings.Map(func(r rune) rune {
		if r > 127 || r < 32 {
			return -1
		}
		return r
	}, decryptedString)
	return decryptedString
}
