# \DefaultApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_auth_token**](DefaultApi.md#create_auth_token) | **PUT** /authenticate | 
[**package_by_name_delete**](DefaultApi.md#package_by_name_delete) | **DELETE** /package/byName/{name} | Delete all versions of this package.
[**package_by_name_get**](DefaultApi.md#package_by_name_get) | **GET** /package/byName/{name} | 
[**package_by_reg_ex_get**](DefaultApi.md#package_by_reg_ex_get) | **POST** /package/byRegEx/{regex} | Get any packages fitting the regular expression.
[**package_create**](DefaultApi.md#package_create) | **POST** /package | 
[**package_delete**](DefaultApi.md#package_delete) | **DELETE** /package/{id} | Delete this version of the package.
[**package_rate**](DefaultApi.md#package_rate) | **GET** /package/{id}/rate | 
[**package_retrieve**](DefaultApi.md#package_retrieve) | **GET** /package/{id} | Interact with the package with this ID
[**package_update**](DefaultApi.md#package_update) | **PUT** /package/{id} | Update this content of the package.
[**packages_list**](DefaultApi.md#packages_list) | **POST** /packages | Get the packages from the registry.
[**registry_reset**](DefaultApi.md#registry_reset) | **DELETE** /reset | Reset the registry



## create_auth_token

> String create_auth_token(authentication_request)


Create an access token.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**authentication_request** | [**AuthenticationRequest**](AuthenticationRequest.md) |  | [required] |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_by_name_delete

> package_by_name_delete(name, x_authorization)
Delete all versions of this package.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**name** | **String** |  | [required] |
**x_authorization** | Option<**String**> |  |  |

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_by_name_get

> Vec<crate::models::PackageHistoryEntry> package_by_name_get(name, x_authorization)


Return the history of this package (all versions).

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**name** | **String** |  | [required] |
**x_authorization** | Option<**String**> |  |  |

### Return type

[**Vec<crate::models::PackageHistoryEntry>**](PackageHistoryEntry.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_by_reg_ex_get

> Vec<crate::models::PackageMetadata> package_by_reg_ex_get(regex, body, x_authorization)
Get any packages fitting the regular expression.

Search for a package using regular expression over package names and READMEs. This is similar to search by name.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**regex** | **String** |  | [required] |
**body** | **String** |  | [required] |
**x_authorization** | Option<**String**> |  |  |

### Return type

[**Vec<crate::models::PackageMetadata>**](PackageMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_create

> crate::models::Package package_create(x_authorization, package_data)


### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_authorization** | **String** |  | [required] |
**package_data** | [**PackageData**](PackageData.md) |  | [required] |

### Return type

[**crate::models::Package**](Package.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_delete

> package_delete(id, x_authorization)
Delete this version of the package.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**id** | **String** | Package ID | [required] |
**x_authorization** | Option<**String**> |  |  |

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_rate

> crate::models::PackageRating package_rate(id, x_authorization)


### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**id** | **String** |  | [required] |
**x_authorization** | Option<**String**> |  |  |

### Return type

[**crate::models::PackageRating**](PackageRating.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_retrieve

> crate::models::Package package_retrieve(id, x_authorization)
Interact with the package with this ID

Return this package.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**id** | **String** | ID of package to fetch | [required] |
**x_authorization** | Option<**String**> |  |  |

### Return type

[**crate::models::Package**](Package.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## package_update

> package_update(id, package, x_authorization)
Update this content of the package.

The name, version, and ID must match.  The package contents (from PackageData) will replace the previous contents.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**id** | **String** |  | [required] |
**package** | [**Package**](Package.md) |  | [required] |
**x_authorization** | Option<**String**> |  |  |

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## packages_list

> Vec<crate::models::PackageMetadata> packages_list(package_query, x_authorization, offset)
Get the packages from the registry.

Get any packages fitting the query. Search for packages satisfying the indicated query.  If you want to enumerate all packages, provide an array with a single PackageQuery whose name is \"*\".  The response is paginated; the response header includes the offset to use in the next query.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**package_query** | [**Vec<crate::models::PackageQuery>**](PackageQuery.md) |  | [required] |
**x_authorization** | Option<**String**> |  |  |
**offset** | Option<**String**> | Provide this for pagination. If not provided, returns the first page of results. |  |

### Return type

[**Vec<crate::models::PackageMetadata>**](PackageMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## registry_reset

> registry_reset(x_authorization)
Reset the registry

Reset the registry to a system default state.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_authorization** | Option<**String**> |  |  |

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

