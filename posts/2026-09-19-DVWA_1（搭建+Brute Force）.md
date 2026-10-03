---
title: DVWA漏洞靶场学习
date: 2026-09-19
module: web安全
sub: 漏洞靶场
summary: 记录基础靶场 DVWA 的部署与漏洞模块练习。
tags:
  - 靶场
---
## 搭建
#### 这是什么样的靶场
这是一个基础的漏洞靶场，漏洞类型较老，适合新手入门训练。每个漏洞模块都有四个等级：
- Low → Medium → High → Impossible
#### docker部署

```shell
git clone https://github.com/digininja/DVWA.git
cd DVWA
docker compose up -d
```

![[DVWA_1.png]]
#### 设置
先Setup/Reset DB   Create/Reset Database
DVWA Security可以调整难度，比如选low，然后就可以开始了
## Brute Force（暴力破解）
### low
可以用`admin' #`这样的万能密码
![[DVWA_Brute_Force_2.png]]
正常登录抓包，爆破账号密码
![[DVWA_Brute_Force_1.png]]
这里可以按length排序，找到登录成功的账号密码
#### low的源码
```php
<?php

if( isset( $_GET[ 'Login' ] ) ) {     //'Login'为入口判断，GET参数在PHP区分大小写
	$user = $_GET[ 'username' ];     //获取url中的username
	$pass = $_GET[ 'password' ];    //获取password
	$pass = md5( $pass );           //MD5password
```
⚠️直接从url query string取值，没有经过任何过滤/校验/转义
对密码做MD5，输出只含0-9，a-f，所以password字段天然无法SQL注入
`$_GET`是PHP的一个超全局变量，超全局变量是所有作用域里都能直接访问的预定义变量，不用global声明，不用传参，函数里直接用

```php
	//SQL查询
	$query  = "SELECT * FROM `users` WHERE user = '$user' AND password = '$pass';";
	
	//执行查询 & 错误回显
	$result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
```
失败时，die()将SQL错误原文打印到页面
三元运算符：(条件A)?(符合走这):(否则走这里)
⚠️会造成信息泄露
```php
//登录成功分支
	if( $result && mysqli_num_rows( $result ) == 1 ) {    //查询成功且结果只有一行
		
		$row    = mysqli_fetch_assoc( $result );  //取一行数据，返回关联数组，字段名做键
		
		$avatar = $row["avatar"];   //$row数组中取出avatar字段，存到$avatar
		
		//拼接HTML字符至$html
		$html .= "<p>Welcome to the password protected area {$user}</p>";
		$html .= "<img src=\"{$avatar}\" />";   //拼接<img>标签
	}
	
//登录失败分支
	else {
		$html .= "<pre><br />Username and/or password incorrect.</pre>";
	}
	
```
`.=`是追加运算符等价于`$html = $html . "..."`
`{$user}` 是 PHP 字符串插值写法（双引号里才能用）
⚠️$user和 $avatar没过滤，存在xss入口
```php
	//关闭连接
	((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}
?>
```
### 以下都是可进行爆破的条件
1. **无失败次数限制** —— 可以无限次尝试
2. **无速率限制** —— 单位时间可发任意多请求
3. **无账号锁定** —— 同一账号可反复试
4. **无验证码** —— 无需人工介入，可完全自动化
5. **失败响应可区分** —— 攻击者能判断"用户名对但密码错"
### medium
```php
<?php
if( isset( $_GET[ 'Login' ] ) ) {   
 
    $user = $_GET[ 'username' ];
    //对用户名SQL转义
    $user = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $user ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    
    $pass = $_GET[ 'password' ];
    //对密码转义
    $pass = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass = md5( $pass );
```
`isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])`这个是检查MySQL连接是否正常
mysqli_real_escape_string()是PHP自带的转义函数，将SQL危险字符转换为安全的
trigger_error，触发一个PHP错误；E_USER_ERROR，致命错误级别，终止整个脚本
⚠️相较于low，增加转义，但只针对' '' \等特殊字符，对数字无效，面对1 OR 1=1这种数字型payload，转义函数不会工作
```php
//SQL拼接
    $query  = "SELECT * FROM `users` WHERE user = '$user' AND password = '$pass';";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );

//成功分支
    if( $result && mysqli_num_rows( $result ) == 1 ) {
        // Get users details
        $row    = mysqli_fetch_assoc( $result );
        $avatar = $row["avatar"];
        // Login successful
        $html .= "<p>Welcome to the password protected area {$user}</p>";
        $html .= "<img src=\"{$avatar}\" />";
    }
    
```
跟low一样
```php
//失败分支
    else {
        sleep( 2 );   //暂停两秒继续
        $html .= "<pre><br />Username and/or password incorrect.</pre>";
    }
    
   //关闭连接 
    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}
?>
```
⚠️相比low，增加sleep(2)防止暴力破解，但可时间盲注