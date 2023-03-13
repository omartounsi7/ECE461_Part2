use futures::{future, future::BoxFuture, Stream, stream, future::FutureExt, stream::TryStreamExt};
use hyper::{Request, Response, StatusCode, Body, HeaderMap};
use hyper::header::{HeaderName, HeaderValue, CONTENT_TYPE};
use log::warn;
#[allow(unused_imports)]
use std::convert::{TryFrom, TryInto};
use std::error::Error;
use std::future::Future;
use std::marker::PhantomData;
use std::task::{Context, Poll};
use swagger::{ApiError, BodyExt, Has, RequestParser, XSpanIdString};
pub use swagger::auth::Authorization;
use swagger::auth::Scopes;
use url::form_urlencoded;

#[allow(unused_imports)]
use crate::models;
use crate::header;

pub use crate::context;

type ServiceFuture = BoxFuture<'static, Result<Response<Body>, crate::ServiceError>>;

use crate::{Api,
     CreateAuthTokenResponse,
     PackageByNameDeleteResponse,
     PackageByNameGetResponse,
     PackageByRegExGetResponse,
     PackageCreateResponse,
     PackageDeleteResponse,
     PackageRateResponse,
     PackageRetrieveResponse,
     PackageUpdateResponse,
     PackagesListResponse,
     RegistryResetResponse
};

mod paths {
    use lazy_static::lazy_static;

    lazy_static! {
        pub static ref GLOBAL_REGEX_SET: regex::RegexSet = regex::RegexSet::new(vec![
            r"^/authenticate$",
            r"^/package$",
            r"^/package/byName/(?P<name>[^/?#]*)$",
            r"^/package/byRegEx/(?P<regex>[^/?#]*)$",
            r"^/package/(?P<id>[^/?#]*)$",
            r"^/package/(?P<id>[^/?#]*)/rate$",
            r"^/packages$",
            r"^/reset$"
        ])
        .expect("Unable to create global regex set");
    }
    pub(crate) static ID_AUTHENTICATE: usize = 0;
    pub(crate) static ID_PACKAGE: usize = 1;
    pub(crate) static ID_PACKAGE_BYNAME_NAME: usize = 2;
    lazy_static! {
        pub static ref REGEX_PACKAGE_BYNAME_NAME: regex::Regex =
            #[allow(clippy::invalid_regex)]
            regex::Regex::new(r"^/package/byName/(?P<name>[^/?#]*)$")
                .expect("Unable to create regex for PACKAGE_BYNAME_NAME");
    }
    pub(crate) static ID_PACKAGE_BYREGEX_REGEX: usize = 3;
    lazy_static! {
        pub static ref REGEX_PACKAGE_BYREGEX_REGEX: regex::Regex =
            #[allow(clippy::invalid_regex)]
            regex::Regex::new(r"^/package/byRegEx/(?P<regex>[^/?#]*)$")
                .expect("Unable to create regex for PACKAGE_BYREGEX_REGEX");
    }
    pub(crate) static ID_PACKAGE_ID: usize = 4;
    lazy_static! {
        pub static ref REGEX_PACKAGE_ID: regex::Regex =
            #[allow(clippy::invalid_regex)]
            regex::Regex::new(r"^/package/(?P<id>[^/?#]*)$")
                .expect("Unable to create regex for PACKAGE_ID");
    }
    pub(crate) static ID_PACKAGE_ID_RATE: usize = 5;
    lazy_static! {
        pub static ref REGEX_PACKAGE_ID_RATE: regex::Regex =
            #[allow(clippy::invalid_regex)]
            regex::Regex::new(r"^/package/(?P<id>[^/?#]*)/rate$")
                .expect("Unable to create regex for PACKAGE_ID_RATE");
    }
    pub(crate) static ID_PACKAGES: usize = 6;
    pub(crate) static ID_RESET: usize = 7;
}

pub struct MakeService<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
{
    api_impl: T,
    marker: PhantomData<C>,
}

impl<T, C> MakeService<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
{
    pub fn new(api_impl: T) -> Self {
        MakeService {
            api_impl,
            marker: PhantomData
        }
    }
}

impl<T, C, Target> hyper::service::Service<Target> for MakeService<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
{
    type Response = Service<T, C>;
    type Error = crate::ServiceError;
    type Future = future::Ready<Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, target: Target) -> Self::Future {
        futures::future::ok(Service::new(
            self.api_impl.clone(),
        ))
    }
}

fn method_not_allowed() -> Result<Response<Body>, crate::ServiceError> {
    Ok(
        Response::builder().status(StatusCode::METHOD_NOT_ALLOWED)
            .body(Body::empty())
            .expect("Unable to create Method Not Allowed response")
    )
}

pub struct Service<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
{
    api_impl: T,
    marker: PhantomData<C>,
}

impl<T, C> Service<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
{
    pub fn new(api_impl: T) -> Self {
        Service {
            api_impl,
            marker: PhantomData
        }
    }
}

impl<T, C> Clone for Service<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
{
    fn clone(&self) -> Self {
        Service {
            api_impl: self.api_impl.clone(),
            marker: self.marker,
        }
    }
}

impl<T, C> hyper::service::Service<(Request<Body>, C)> for Service<T, C> where
    T: Api<C> + Clone + Send + Sync + 'static,
    C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
{
    type Response = Response<Body>;
    type Error = crate::ServiceError;
    type Future = ServiceFuture;

    fn poll_ready(&mut self, cx: &mut Context) -> Poll<Result<(), Self::Error>> {
        self.api_impl.poll_ready(cx)
    }

    fn call(&mut self, req: (Request<Body>, C)) -> Self::Future { async fn run<T, C>(mut api_impl: T, req: (Request<Body>, C)) -> Result<Response<Body>, crate::ServiceError> where
        T: Api<C> + Clone + Send + 'static,
        C: Has<XSpanIdString> + Has<Option<Authorization>> + Send + Sync + 'static
    {
        let (request, context) = req;
        let (parts, body) = request.into_parts();
        let (method, uri, headers) = (parts.method, parts.uri, parts.headers);
        let path = paths::GLOBAL_REGEX_SET.matches(uri.path());

        match method {

            // CreateAuthToken - PUT /authenticate
            hyper::Method::PUT if path.matched(paths::ID_AUTHENTICATE) => {
                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_authentication_request: Option<models::AuthenticationRequest> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&*body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_authentication_request) => param_authentication_request,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter AuthenticationRequest - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter AuthenticationRequest due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_authentication_request = match param_authentication_request {
                                    Some(param_authentication_request) => param_authentication_request,
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter AuthenticationRequest"))
                                                        .expect("Unable to create Bad Request response for missing body parameter AuthenticationRequest")),
                                };

                                let result = api_impl.create_auth_token(
                                            param_authentication_request,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                CreateAuthTokenResponse::ReturnAnAuthenticationToken
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for CREATE_AUTH_TOKEN_RETURN_AN_AUTHENTICATION_TOKEN"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                CreateAuthTokenResponse::TheUserOrPasswordIsInvalid
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(401).expect("Unable to turn 401 into a StatusCode");
                                                },
                                                CreateAuthTokenResponse::ThisSystemDoesNotSupportAuthentication
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(501).expect("Unable to turn 501 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter AuthenticationRequest: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter AuthenticationRequest")),
                        }
            },

            // PackageByNameDelete - DELETE /package/byName/{name}
            hyper::Method::DELETE if path.matched(paths::ID_PACKAGE_BYNAME_NAME) => {
                // Path parameters
                let path: &str = uri.path();
                let path_params =
                    paths::REGEX_PACKAGE_BYNAME_NAME
                    .captures(path)
                    .unwrap_or_else(||
                        panic!("Path {} matched RE PACKAGE_BYNAME_NAME in set but failed match against \"{}\"", path, paths::REGEX_PACKAGE_BYNAME_NAME.as_str())
                    );

                let param_name = match percent_encoding::percent_decode(path_params["name"].as_bytes()).decode_utf8() {
                    Ok(param_name) => match param_name.parse::<String>() {
                        Ok(param_name) => param_name,
                        Err(e) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't parse path parameter name: {}", e)))
                                        .expect("Unable to create Bad Request response for invalid path parameter")),
                    },
                    Err(_) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't percent-decode path parameter as UTF-8: {}", &path_params["name"])))
                                        .expect("Unable to create Bad Request response for invalid percent decode"))
                };

                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                                let result = api_impl.package_by_name_delete(
                                            param_name,
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageByNameDeleteResponse::PackageIsDeleted
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                },
                                                PackageByNameDeleteResponse::PackageDoesNotExist
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
            },

            // PackageByNameGet - GET /package/byName/{name}
            hyper::Method::GET if path.matched(paths::ID_PACKAGE_BYNAME_NAME) => {
                // Path parameters
                let path: &str = uri.path();
                let path_params =
                    paths::REGEX_PACKAGE_BYNAME_NAME
                    .captures(path)
                    .unwrap_or_else(||
                        panic!("Path {} matched RE PACKAGE_BYNAME_NAME in set but failed match against \"{}\"", path, paths::REGEX_PACKAGE_BYNAME_NAME.as_str())
                    );

                let param_name = match percent_encoding::percent_decode(path_params["name"].as_bytes()).decode_utf8() {
                    Ok(param_name) => match param_name.parse::<String>() {
                        Ok(param_name) => param_name,
                        Err(e) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't parse path parameter name: {}", e)))
                                        .expect("Unable to create Bad Request response for invalid path parameter")),
                    },
                    Err(_) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't percent-decode path parameter as UTF-8: {}", &path_params["name"])))
                                        .expect("Unable to create Bad Request response for invalid percent decode"))
                };

                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                                let result = api_impl.package_by_name_get(
                                            param_name,
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageByNameGetResponse::ReturnThePackageHistory
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGE_BY_NAME_GET_RETURN_THE_PACKAGE_HISTORY"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                PackageByNameGetResponse::NoSuchPackage
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                                PackageByNameGetResponse::UnexpectedError
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(0).expect("Unable to turn 0 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGE_BY_NAME_GET_UNEXPECTED_ERROR"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
            },

            // PackageByRegExGet - POST /package/byRegEx/{regex}
            hyper::Method::POST if path.matched(paths::ID_PACKAGE_BYREGEX_REGEX) => {
                // Path parameters
                let path: &str = uri.path();
                let path_params =
                    paths::REGEX_PACKAGE_BYREGEX_REGEX
                    .captures(path)
                    .unwrap_or_else(||
                        panic!("Path {} matched RE PACKAGE_BYREGEX_REGEX in set but failed match against \"{}\"", path, paths::REGEX_PACKAGE_BYREGEX_REGEX.as_str())
                    );

                let param_regex = match percent_encoding::percent_decode(path_params["regex"].as_bytes()).decode_utf8() {
                    Ok(param_regex) => match param_regex.parse::<String>() {
                        Ok(param_regex) => param_regex,
                        Err(e) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't parse path parameter regex: {}", e)))
                                        .expect("Unable to create Bad Request response for invalid path parameter")),
                    },
                    Err(_) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't percent-decode path parameter as UTF-8: {}", &path_params["regex"])))
                                        .expect("Unable to create Bad Request response for invalid percent decode"))
                };

                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_body: Option<models::PackageRegEx> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&*body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_body) => param_body,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter body - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter body due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_body = match param_body {
                                    Some(param_body) => param_body,
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter body"))
                                                        .expect("Unable to create Bad Request response for missing body parameter body")),
                                };

                                let result = api_impl.package_by_reg_ex_get(
                                            param_regex,
                                            param_body,
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageByRegExGetResponse::ReturnAListOfPackages
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGE_BY_REG_EX_GET_RETURN_A_LIST_OF_PACKAGES"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                PackageByRegExGetResponse::NoPackageFoundUnderThisRegex
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter body: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter body")),
                        }
            },

            // PackageCreate - POST /package
            hyper::Method::POST if path.matched(paths::ID_PACKAGE) => {
                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            result.0,
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from("Missing required header X-Authorization"))
                                        .expect("Unable to create Bad Request response for missing required header X-Authorization"));
                    }
                };

                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_package_data: Option<models::PackageData> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&*body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_package_data) => param_package_data,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter PackageData - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter PackageData due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_package_data = match param_package_data {
                                    Some(param_package_data) => param_package_data,
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter PackageData"))
                                                        .expect("Unable to create Bad Request response for missing body parameter PackageData")),
                                };

                                let result = api_impl.package_create(
                                            param_x_authorization,
                                            param_package_data,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageCreateResponse::Success
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(201).expect("Unable to turn 201 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGE_CREATE_SUCCESS"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                PackageCreateResponse::PackageExistsAlready
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(409).expect("Unable to turn 409 into a StatusCode");
                                                },
                                                PackageCreateResponse::PackageIsNotUploadedDueToTheDisqualifiedRating
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(424).expect("Unable to turn 424 into a StatusCode");
                                                },
                                                PackageCreateResponse::AuthenticationFailed
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(403).expect("Unable to turn 403 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter PackageData: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter PackageData")),
                        }
            },

            // PackageDelete - DELETE /package/{id}
            hyper::Method::DELETE if path.matched(paths::ID_PACKAGE_ID) => {
                // Path parameters
                let path: &str = uri.path();
                let path_params =
                    paths::REGEX_PACKAGE_ID
                    .captures(path)
                    .unwrap_or_else(||
                        panic!("Path {} matched RE PACKAGE_ID in set but failed match against \"{}\"", path, paths::REGEX_PACKAGE_ID.as_str())
                    );

                let param_id = match percent_encoding::percent_decode(path_params["id"].as_bytes()).decode_utf8() {
                    Ok(param_id) => match param_id.parse::<String>() {
                        Ok(param_id) => param_id,
                        Err(e) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't parse path parameter id: {}", e)))
                                        .expect("Unable to create Bad Request response for invalid path parameter")),
                    },
                    Err(_) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't percent-decode path parameter as UTF-8: {}", &path_params["id"])))
                                        .expect("Unable to create Bad Request response for invalid percent decode"))
                };

                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                                let result = api_impl.package_delete(
                                            param_id,
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageDeleteResponse::PackageIsDeleted
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                },
                                                PackageDeleteResponse::PackageDoesNotExist
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
            },

            // PackageRate - GET /package/{id}/rate
            hyper::Method::GET if path.matched(paths::ID_PACKAGE_ID_RATE) => {
                // Path parameters
                let path: &str = uri.path();
                let path_params =
                    paths::REGEX_PACKAGE_ID_RATE
                    .captures(path)
                    .unwrap_or_else(||
                        panic!("Path {} matched RE PACKAGE_ID_RATE in set but failed match against \"{}\"", path, paths::REGEX_PACKAGE_ID_RATE.as_str())
                    );

                let param_id = match percent_encoding::percent_decode(path_params["id"].as_bytes()).decode_utf8() {
                    Ok(param_id) => match param_id.parse::<String>() {
                        Ok(param_id) => param_id,
                        Err(e) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't parse path parameter id: {}", e)))
                                        .expect("Unable to create Bad Request response for invalid path parameter")),
                    },
                    Err(_) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't percent-decode path parameter as UTF-8: {}", &path_params["id"])))
                                        .expect("Unable to create Bad Request response for invalid percent decode"))
                };

                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                                let result = api_impl.package_rate(
                                            param_id,
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageRateResponse::ReturnTheRating
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGE_RATE_RETURN_THE_RATING"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                PackageRateResponse::ThePackageRatingSystemChokedOnAtLeastOneOfTheMetrics
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(500).expect("Unable to turn 500 into a StatusCode");
                                                },
                                                PackageRateResponse::PackageDoesNotExist
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
            },

            // PackageRetrieve - GET /package/{id}
            hyper::Method::GET if path.matched(paths::ID_PACKAGE_ID) => {
                // Path parameters
                let path: &str = uri.path();
                let path_params =
                    paths::REGEX_PACKAGE_ID
                    .captures(path)
                    .unwrap_or_else(||
                        panic!("Path {} matched RE PACKAGE_ID in set but failed match against \"{}\"", path, paths::REGEX_PACKAGE_ID.as_str())
                    );

                let param_id = match percent_encoding::percent_decode(path_params["id"].as_bytes()).decode_utf8() {
                    Ok(param_id) => match param_id.parse::<String>() {
                        Ok(param_id) => param_id,
                        Err(e) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't parse path parameter id: {}", e)))
                                        .expect("Unable to create Bad Request response for invalid path parameter")),
                    },
                    Err(_) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't percent-decode path parameter as UTF-8: {}", &path_params["id"])))
                                        .expect("Unable to create Bad Request response for invalid percent decode"))
                };

                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                                let result = api_impl.package_retrieve(
                                            param_id,
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageRetrieveResponse::ReturnThePackage
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGE_RETRIEVE_RETURN_THE_PACKAGE"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                PackageRetrieveResponse::PackageDoesNotExist
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                                PackageRetrieveResponse::UnexpectedError
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(0).expect("Unable to turn 0 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGE_RETRIEVE_UNEXPECTED_ERROR"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
            },

            // PackageUpdate - PUT /package/{id}
            hyper::Method::PUT if path.matched(paths::ID_PACKAGE_ID) => {
                // Path parameters
                let path: &str = uri.path();
                let path_params =
                    paths::REGEX_PACKAGE_ID
                    .captures(path)
                    .unwrap_or_else(||
                        panic!("Path {} matched RE PACKAGE_ID in set but failed match against \"{}\"", path, paths::REGEX_PACKAGE_ID.as_str())
                    );

                let param_id = match percent_encoding::percent_decode(path_params["id"].as_bytes()).decode_utf8() {
                    Ok(param_id) => match param_id.parse::<String>() {
                        Ok(param_id) => param_id,
                        Err(e) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't parse path parameter id: {}", e)))
                                        .expect("Unable to create Bad Request response for invalid path parameter")),
                    },
                    Err(_) => return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Couldn't percent-decode path parameter as UTF-8: {}", &path_params["id"])))
                                        .expect("Unable to create Bad Request response for invalid percent decode"))
                };

                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_package: Option<models::Package> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&*body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_package) => param_package,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter Package - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter Package due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_package = match param_package {
                                    Some(param_package) => param_package,
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter Package"))
                                                        .expect("Unable to create Bad Request response for missing body parameter Package")),
                                };

                                let result = api_impl.package_update(
                                            param_id,
                                            param_package,
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackageUpdateResponse::VersionIsUpdated
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                },
                                                PackageUpdateResponse::PackageDoesNotExist
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter Package: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter Package")),
                        }
            },

            // PackagesList - POST /packages
            hyper::Method::POST if path.matched(paths::ID_PACKAGES) => {
                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                // Query parameters (note that non-required or collection query parameters will ignore garbage values, rather than causing a 400 response)
                let query_params = form_urlencoded::parse(uri.query().unwrap_or_default().as_bytes()).collect::<Vec<_>>();
                let param_offset = query_params.iter().filter(|e| e.0 == "offset").map(|e| e.1.to_owned())
                    .next();
                let param_offset = match param_offset {
                    Some(param_offset) => {
                        let param_offset =
                            <String as std::str::FromStr>::from_str
                                (&param_offset);
                        match param_offset {
                            Ok(param_offset) => Some(param_offset),
                            Err(e) => return Ok(Response::builder()
                                .status(StatusCode::BAD_REQUEST)
                                .body(Body::from(format!("Couldn't parse query parameter offset - doesn't match schema: {}", e)))
                                .expect("Unable to create Bad Request response for invalid query parameter offset")),
                        }
                    },
                    None => None,
                };

                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_package_query: Option<Vec<models::PackageQuery>> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&*body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_package_query) => param_package_query,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter PackageQuery - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter PackageQuery due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_package_query = match param_package_query {
                                    Some(param_package_query) => param_package_query,
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter PackageQuery"))
                                                        .expect("Unable to create Bad Request response for missing body parameter PackageQuery")),
                                };

                                let result = api_impl.packages_list(
                                            param_package_query.as_ref(),
                                            param_x_authorization,
                                            param_offset,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                PackagesListResponse::ListOfPackages
                                                    {
                                                        body,
                                                        offset
                                                    }
                                                => {
                                                    if let Some(offset) = offset {
                                                    let offset = match header::IntoHeaderValue(offset).try_into() {
                                                        Ok(val) => val,
                                                        Err(e) => {
                                                            return Ok(Response::builder()
                                                                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                                                                    .body(Body::from(format!("An internal server error occurred handling offset header - {}", e)))
                                                                    .expect("Unable to create Internal Server Error for invalid response header"))
                                                        }
                                                    };

                                                    response.headers_mut().insert(
                                                        HeaderName::from_static("offset"),
                                                        offset
                                                    );
                                                    }
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGES_LIST_LIST_OF_PACKAGES"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                PackagesListResponse::TooManyPackagesReturned
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(413).expect("Unable to turn 413 into a StatusCode");
                                                },
                                                PackagesListResponse::UnexpectedError
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(0).expect("Unable to turn 0 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for PACKAGES_LIST_UNEXPECTED_ERROR"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter PackageQuery: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter PackageQuery")),
                        }
            },

            // RegistryReset - DELETE /reset
            hyper::Method::DELETE if path.matched(paths::ID_RESET) => {
                // Header parameters
                let param_x_authorization = headers.get(HeaderName::from_static("x-authorization"));

                let param_x_authorization = match param_x_authorization {
                    Some(v) => match header::IntoHeaderValue::<String>::try_from((*v).clone()) {
                        Ok(result) =>
                            Some(result.0),
                        Err(err) => {
                            return Ok(Response::builder()
                                        .status(StatusCode::BAD_REQUEST)
                                        .body(Body::from(format!("Invalid header X-Authorization - {}", err)))
                                        .expect("Unable to create Bad Request response for invalid header X-Authorization"));

                        },
                    },
                    None => {
                        None
                    }
                };

                                let result = api_impl.registry_reset(
                                            param_x_authorization,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        match result {
                                            Ok(rsp) => match rsp {
                                                RegistryResetResponse::RegistryIsReset
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                },
                                                RegistryResetResponse::YouDoNotHavePermissionToResetTheRegistry
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(401).expect("Unable to turn 401 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
            },

            _ if path.matched(paths::ID_AUTHENTICATE) => method_not_allowed(),
            _ if path.matched(paths::ID_PACKAGE) => method_not_allowed(),
            _ if path.matched(paths::ID_PACKAGE_BYNAME_NAME) => method_not_allowed(),
            _ if path.matched(paths::ID_PACKAGE_BYREGEX_REGEX) => method_not_allowed(),
            _ if path.matched(paths::ID_PACKAGE_ID) => method_not_allowed(),
            _ if path.matched(paths::ID_PACKAGE_ID_RATE) => method_not_allowed(),
            _ if path.matched(paths::ID_PACKAGES) => method_not_allowed(),
            _ if path.matched(paths::ID_RESET) => method_not_allowed(),
            _ => Ok(Response::builder().status(StatusCode::NOT_FOUND)
                    .body(Body::empty())
                    .expect("Unable to create Not Found response"))
        }
    } Box::pin(run(self.api_impl.clone(), req)) }
}

/// Request parser for `Api`.
pub struct ApiRequestParser;
impl<T> RequestParser<T> for ApiRequestParser {
    fn parse_operation_id(request: &Request<T>) -> Option<&'static str> {
        let path = paths::GLOBAL_REGEX_SET.matches(request.uri().path());
        match *request.method() {
            // CreateAuthToken - PUT /authenticate
            hyper::Method::PUT if path.matched(paths::ID_AUTHENTICATE) => Some("CreateAuthToken"),
            // PackageByNameDelete - DELETE /package/byName/{name}
            hyper::Method::DELETE if path.matched(paths::ID_PACKAGE_BYNAME_NAME) => Some("PackageByNameDelete"),
            // PackageByNameGet - GET /package/byName/{name}
            hyper::Method::GET if path.matched(paths::ID_PACKAGE_BYNAME_NAME) => Some("PackageByNameGet"),
            // PackageByRegExGet - POST /package/byRegEx/{regex}
            hyper::Method::POST if path.matched(paths::ID_PACKAGE_BYREGEX_REGEX) => Some("PackageByRegExGet"),
            // PackageCreate - POST /package
            hyper::Method::POST if path.matched(paths::ID_PACKAGE) => Some("PackageCreate"),
            // PackageDelete - DELETE /package/{id}
            hyper::Method::DELETE if path.matched(paths::ID_PACKAGE_ID) => Some("PackageDelete"),
            // PackageRate - GET /package/{id}/rate
            hyper::Method::GET if path.matched(paths::ID_PACKAGE_ID_RATE) => Some("PackageRate"),
            // PackageRetrieve - GET /package/{id}
            hyper::Method::GET if path.matched(paths::ID_PACKAGE_ID) => Some("PackageRetrieve"),
            // PackageUpdate - PUT /package/{id}
            hyper::Method::PUT if path.matched(paths::ID_PACKAGE_ID) => Some("PackageUpdate"),
            // PackagesList - POST /packages
            hyper::Method::POST if path.matched(paths::ID_PACKAGES) => Some("PackagesList"),
            // RegistryReset - DELETE /reset
            hyper::Method::DELETE if path.matched(paths::ID_RESET) => Some("RegistryReset"),
            _ => None,
        }
    }
}
