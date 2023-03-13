# default_api

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
**CreateAuthToken**](default_api.md#CreateAuthToken) | **PUT** /authenticate | 
**PackageByNameDelete**](default_api.md#PackageByNameDelete) | **DELETE** /package/byName/{name} | Delete all versions of this package.
**PackageByNameGet**](default_api.md#PackageByNameGet) | **GET** /package/byName/{name} | 
**PackageByRegExGet**](default_api.md#PackageByRegExGet) | **POST** /package/byRegEx/{regex} | Get any packages fitting the regular expression.
**PackageCreate**](default_api.md#PackageCreate) | **POST** /package | 
**PackageDelete**](default_api.md#PackageDelete) | **DELETE** /package/{id} | Delete this version of the package.
**PackageRate**](default_api.md#PackageRate) | **GET** /package/{id}/rate | 
**PackageRetrieve**](default_api.md#PackageRetrieve) | **GET** /package/{id} | Interact with the package with this ID
**PackageUpdate**](default_api.md#PackageUpdate) | **PUT** /package/{id} | Update this content of the package.
**PackagesList**](default_api.md#PackagesList) | **POST** /packages | Get the packages from the registry.
**RegistryReset**](default_api.md#RegistryReset) | **DELETE** /reset | Reset the registry


# **CreateAuthToken**
> String CreateAuthToken(authentication_request)


Create an access token.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **authentication_request** | [**AuthenticationRequest**](AuthenticationRequest.md)|  | 

### Return type

[**String**](string.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageByNameDelete**
> PackageByNameDelete(name, optional)
Delete all versions of this package.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **name** | **String**|  | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **String**|  | 
 **x_authorization** | **String**|  | 

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageByNameGet**
> Vec<models::PackageHistoryEntry> PackageByNameGet(name, optional)


Return the history of this package (all versions).

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **name** | **String**|  | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **String**|  | 
 **x_authorization** | **String**|  | 

### Return type

[**Vec<models::PackageHistoryEntry>**](PackageHistoryEntry.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageByRegExGet**
> Vec<models::PackageMetadata> PackageByRegExGet(regex, body, optional)
Get any packages fitting the regular expression.

Search for a package using regular expression over package names and READMEs. This is similar to search by name.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **regex** | **String**|  | 
  **body** | [**string**](string.md)|  | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **regex** | **String**|  | 
 **body** | [**string**](string.md)|  | 
 **x_authorization** | **String**|  | 

### Return type

[**Vec<models::PackageMetadata>**](PackageMetadata.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageCreate**
> models::Package PackageCreate(x_authorization, package_data)


### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **x_authorization** | **String**|  | 
  **package_data** | [**PackageData**](PackageData.md)|  | 

### Return type

[**models::Package**](Package.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageDelete**
> PackageDelete(id, optional)
Delete this version of the package.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **id** | **String**| Package ID | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**| Package ID | 
 **x_authorization** | **String**|  | 

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageRate**
> models::PackageRating PackageRate(id, optional)


### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **id** | **String**|  | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **x_authorization** | **String**|  | 

### Return type

[**models::PackageRating**](PackageRating.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageRetrieve**
> models::Package PackageRetrieve(id, optional)
Interact with the package with this ID

Return this package.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **id** | **String**| ID of package to fetch | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**| ID of package to fetch | 
 **x_authorization** | **String**|  | 

### Return type

[**models::Package**](Package.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackageUpdate**
> PackageUpdate(id, package, optional)
Update this content of the package.

The name, version, and ID must match.  The package contents (from PackageData) will replace the previous contents.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **id** | **String**|  | 
  **package** | [**Package**](Package.md)|  | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **package** | [**Package**](Package.md)|  | 
 **x_authorization** | **String**|  | 

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **PackagesList**
> Vec<models::PackageMetadata> PackagesList(package_query, optional)
Get the packages from the registry.

Get any packages fitting the query. Search for packages satisfying the indicated query.  If you want to enumerate all packages, provide an array with a single PackageQuery whose name is \"*\".  The response is paginated; the response header includes the offset to use in the next query.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
  **package_query** | [**PackageQuery**](PackageQuery.md)|  | 
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **package_query** | [**PackageQuery**](PackageQuery.md)|  | 
 **x_authorization** | **String**|  | 
 **offset** | **String**| Provide this for pagination. If not provided, returns the first page of results. | 

### Return type

[**Vec<models::PackageMetadata>**](PackageMetadata.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **RegistryReset**
> RegistryReset(optional)
Reset the registry

Reset the registry to a system default state.

### Required Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **optional** | **map[string]interface{}** | optional parameters | nil if no parameters

### Optional Parameters
Optional parameters are passed through a map[string]interface{}.

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_authorization** | **String**|  | 

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

