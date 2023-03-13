//! Main library entry point for openapi_client implementation.

#![allow(unused_imports)]

use async_trait::async_trait;
use futures::{future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use hyper::server::conn::Http;
use hyper::service::Service;
use log::info;
use std::future::Future;
use std::marker::PhantomData;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};
use swagger::{Has, XSpanIdString};
use swagger::auth::MakeAllowAllAuthenticator;
use swagger::EmptyContext;
use tokio::net::TcpListener;

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "ios")))]
use openssl::ssl::{Ssl, SslAcceptor, SslAcceptorBuilder, SslFiletype, SslMethod};

use openapi_client::models;

/// Builds an SSL implementation for Simple HTTPS from some hard-coded file names
pub async fn create(addr: &str, https: bool) {
    let addr = addr.parse().expect("Failed to parse bind address");

    let server = Server::new();

    let service = MakeService::new(server);

    let service = MakeAllowAllAuthenticator::new(service, "cosmo");

    #[allow(unused_mut)]
    let mut service =
        openapi_client::server::context::MakeAddContext::<_, EmptyContext>::new(
            service
        );

    if https {
        #[cfg(any(target_os = "macos", target_os = "windows", target_os = "ios"))]
        {
            unimplemented!("SSL is not implemented for the examples on MacOS, Windows or iOS");
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "ios")))]
        {
            let mut ssl = SslAcceptor::mozilla_intermediate_v5(SslMethod::tls()).expect("Failed to create SSL Acceptor");

            // Server authentication
            ssl.set_private_key_file("examples/server-key.pem", SslFiletype::PEM).expect("Failed to set private key");
            ssl.set_certificate_chain_file("examples/server-chain.pem").expect("Failed to set certificate chain");
            ssl.check_private_key().expect("Failed to check private key");

            let tls_acceptor = ssl.build();
            let tcp_listener = TcpListener::bind(&addr).await.unwrap();

            loop {
                if let Ok((tcp, _)) = tcp_listener.accept().await {
                    let ssl = Ssl::new(tls_acceptor.context()).unwrap();
                    let addr = tcp.peer_addr().expect("Unable to get remote address");
                    let service = service.call(addr);

                    tokio::spawn(async move {
                        let tls = tokio_openssl::SslStream::new(ssl, tcp).map_err(|_| ())?;
                        let service = service.await.map_err(|_| ())?;

                        Http::new()
                            .serve_connection(tls, service)
                            .await
                            .map_err(|_| ())
                    });
                }
            }
        }
    } else {
        // Using HTTP
        hyper::server::Server::bind(&addr).serve(service).await.unwrap()
    }
}

#[derive(Copy, Clone)]
pub struct Server<C> {
    marker: PhantomData<C>,
}

impl<C> Server<C> {
    pub fn new() -> Self {
        Server{marker: PhantomData}
    }
}


use openapi_client::{
    Api,
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
    RegistryResetResponse,
};
use openapi_client::server::MakeService;
use std::error::Error;
use swagger::ApiError;

#[async_trait]
impl<C> Api<C> for Server<C> where C: Has<XSpanIdString> + Send + Sync
{
    async fn create_auth_token(
        &self,
        authentication_request: models::AuthenticationRequest,
        context: &C) -> Result<CreateAuthTokenResponse, ApiError>
    {
        let context = context.clone();
        info!("create_auth_token({:?}) - X-Span-ID: {:?}", authentication_request, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    /// Delete all versions of this package.
    async fn package_by_name_delete(
        &self,
        name: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageByNameDeleteResponse, ApiError>
    {
        let context = context.clone();
        info!("package_by_name_delete(\"{}\", {:?}) - X-Span-ID: {:?}", name, x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    async fn package_by_name_get(
        &self,
        name: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageByNameGetResponse, ApiError>
    {
        let context = context.clone();
        info!("package_by_name_get(\"{}\", {:?}) - X-Span-ID: {:?}", name, x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    /// Get any packages fitting the regular expression.
    async fn package_by_reg_ex_get(
        &self,
        regex: String,
        body: models::PackageRegEx,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageByRegExGetResponse, ApiError>
    {
        let context = context.clone();
        info!("package_by_reg_ex_get(\"{}\", {:?}, {:?}) - X-Span-ID: {:?}", regex, body, x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    async fn package_create(
        &self,
        x_authorization: String,
        package_data: models::PackageData,
        context: &C) -> Result<PackageCreateResponse, ApiError>
    {
        let context = context.clone();
        info!("package_create(\"{}\", {:?}) - X-Span-ID: {:?}", x_authorization, package_data, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    /// Delete this version of the package.
    async fn package_delete(
        &self,
        id: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageDeleteResponse, ApiError>
    {
        let context = context.clone();
        info!("package_delete(\"{}\", {:?}) - X-Span-ID: {:?}", id, x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    async fn package_rate(
        &self,
        id: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageRateResponse, ApiError>
    {
        let context = context.clone();
        info!("package_rate(\"{}\", {:?}) - X-Span-ID: {:?}", id, x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    /// Interact with the package with this ID
    async fn package_retrieve(
        &self,
        id: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageRetrieveResponse, ApiError>
    {
        let context = context.clone();
        info!("package_retrieve(\"{}\", {:?}) - X-Span-ID: {:?}", id, x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    /// Update this content of the package.
    async fn package_update(
        &self,
        id: String,
        package: models::Package,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageUpdateResponse, ApiError>
    {
        let context = context.clone();
        info!("package_update(\"{}\", {:?}, {:?}) - X-Span-ID: {:?}", id, package, x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    /// Get the packages from the registry.
    async fn packages_list(
        &self,
        package_query: &Vec<models::PackageQuery>,
        x_authorization: Option<String>,
        offset: Option<String>,
        context: &C) -> Result<PackagesListResponse, ApiError>
    {
        let context = context.clone();
        info!("packages_list({:?}, {:?}, {:?}) - X-Span-ID: {:?}", package_query, x_authorization, offset, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

    /// Reset the registry
    async fn registry_reset(
        &self,
        x_authorization: Option<String>,
        context: &C) -> Result<RegistryResetResponse, ApiError>
    {
        let context = context.clone();
        info!("registry_reset({:?}) - X-Span-ID: {:?}", x_authorization, context.get().0.clone());
        Err(ApiError("Generic failure".into()))
    }

}
