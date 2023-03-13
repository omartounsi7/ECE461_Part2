#![allow(missing_docs, trivial_casts, unused_variables, unused_mut, unused_imports, unused_extern_crates, non_camel_case_types)]
#![allow(unused_imports, unused_attributes)]
#![allow(clippy::derive_partial_eq_without_eq, clippy::blacklisted_name)]

use async_trait::async_trait;
use futures::Stream;
use std::error::Error;
use std::task::{Poll, Context};
use swagger::{ApiError, ContextWrapper};
use serde::{Serialize, Deserialize};

type ServiceError = Box<dyn Error + Send + Sync + 'static>;

pub const BASE_PATH: &str = "";
pub const API_VERSION: &str = "2.0.0";

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum CreateAuthTokenResponse {
    /// Return an AuthenticationToken.
    ReturnAnAuthenticationToken
    (String)
    ,
    /// The user or password is invalid.
    TheUserOrPasswordIsInvalid
    ,
    /// This system does not support authentication.
    ThisSystemDoesNotSupportAuthentication
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageByNameDeleteResponse {
    /// Package is deleted.
    PackageIsDeleted
    ,
    /// Package does not exist.
    PackageDoesNotExist
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageByNameGetResponse {
    /// Return the package history.
    ReturnThePackageHistory
    (Vec<models::PackageHistoryEntry>)
    ,
    /// No such package.
    NoSuchPackage
    ,
    /// unexpected error
    UnexpectedError
    (models::Error)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageByRegExGetResponse {
    /// Return a list of packages.
    ReturnAListOfPackages
    (Vec<models::PackageMetadata>)
    ,
    /// No package found under this regex.
    NoPackageFoundUnderThisRegex
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageCreateResponse {
    /// Success. Check the ID in the returned metadata for the official ID.
    Success
    (models::Package)
    ,
    /// Package exists already.
    PackageExistsAlready
    ,
    /// Package is not uploaded due to the disqualified rating.
    PackageIsNotUploadedDueToTheDisqualifiedRating
    ,
    /// Authentication failed (e.g. AuthenticationToken invalid or does not exist)
    AuthenticationFailed
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageDeleteResponse {
    /// Package is deleted.
    PackageIsDeleted
    ,
    /// Package does not exist.
    PackageDoesNotExist
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageRateResponse {
    /// Return the rating. Only use this if each metric was computed successfully.
    ReturnTheRating
    (models::PackageRating)
    ,
    /// The package rating system choked on at least one of the metrics.
    ThePackageRatingSystemChokedOnAtLeastOneOfTheMetrics
    ,
    /// Package does not exist.
    PackageDoesNotExist
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageRetrieveResponse {
    /// Return the package.
    ReturnThePackage
    (models::Package)
    ,
    /// Package does not exist.
    PackageDoesNotExist
    ,
    /// unexpected error
    UnexpectedError
    (models::Error)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackageUpdateResponse {
    /// Version is updated.
    VersionIsUpdated
    ,
    /// Package does not exist.
    PackageDoesNotExist
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum PackagesListResponse {
    /// List of packages
    ListOfPackages
    {
        body: Vec<models::PackageMetadata>,
        offset:
        Option<
        String
        >
    }
    ,
    /// Too many packages returned.
    TooManyPackagesReturned
    ,
    /// unexpected error
    UnexpectedError
    (models::Error)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum RegistryResetResponse {
    /// Registry is reset.
    RegistryIsReset
    ,
    /// You do not have permission to reset the registry.
    YouDoNotHavePermissionToResetTheRegistry
}

/// API
#[async_trait]
#[allow(clippy::too_many_arguments, clippy::ptr_arg)]
pub trait Api<C: Send + Sync> {
    fn poll_ready(&self, _cx: &mut Context) -> Poll<Result<(), Box<dyn Error + Send + Sync + 'static>>> {
        Poll::Ready(Ok(()))
    }

    async fn create_auth_token(
        &self,
        authentication_request: models::AuthenticationRequest,
        context: &C) -> Result<CreateAuthTokenResponse, ApiError>;

    /// Delete all versions of this package.
    async fn package_by_name_delete(
        &self,
        name: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageByNameDeleteResponse, ApiError>;

    async fn package_by_name_get(
        &self,
        name: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageByNameGetResponse, ApiError>;

    /// Get any packages fitting the regular expression.
    async fn package_by_reg_ex_get(
        &self,
        regex: String,
        body: models::PackageRegEx,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageByRegExGetResponse, ApiError>;

    async fn package_create(
        &self,
        x_authorization: String,
        package_data: models::PackageData,
        context: &C) -> Result<PackageCreateResponse, ApiError>;

    /// Delete this version of the package.
    async fn package_delete(
        &self,
        id: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageDeleteResponse, ApiError>;

    async fn package_rate(
        &self,
        id: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageRateResponse, ApiError>;

    /// Interact with the package with this ID
    async fn package_retrieve(
        &self,
        id: String,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageRetrieveResponse, ApiError>;

    /// Update this content of the package.
    async fn package_update(
        &self,
        id: String,
        package: models::Package,
        x_authorization: Option<String>,
        context: &C) -> Result<PackageUpdateResponse, ApiError>;

    /// Get the packages from the registry.
    async fn packages_list(
        &self,
        package_query: &Vec<models::PackageQuery>,
        x_authorization: Option<String>,
        offset: Option<String>,
        context: &C) -> Result<PackagesListResponse, ApiError>;

    /// Reset the registry
    async fn registry_reset(
        &self,
        x_authorization: Option<String>,
        context: &C) -> Result<RegistryResetResponse, ApiError>;

}

/// API where `Context` isn't passed on every API call
#[async_trait]
#[allow(clippy::too_many_arguments, clippy::ptr_arg)]
pub trait ApiNoContext<C: Send + Sync> {

    fn poll_ready(&self, _cx: &mut Context) -> Poll<Result<(), Box<dyn Error + Send + Sync + 'static>>>;

    fn context(&self) -> &C;

    async fn create_auth_token(
        &self,
        authentication_request: models::AuthenticationRequest,
        ) -> Result<CreateAuthTokenResponse, ApiError>;

    /// Delete all versions of this package.
    async fn package_by_name_delete(
        &self,
        name: String,
        x_authorization: Option<String>,
        ) -> Result<PackageByNameDeleteResponse, ApiError>;

    async fn package_by_name_get(
        &self,
        name: String,
        x_authorization: Option<String>,
        ) -> Result<PackageByNameGetResponse, ApiError>;

    /// Get any packages fitting the regular expression.
    async fn package_by_reg_ex_get(
        &self,
        regex: String,
        body: models::PackageRegEx,
        x_authorization: Option<String>,
        ) -> Result<PackageByRegExGetResponse, ApiError>;

    async fn package_create(
        &self,
        x_authorization: String,
        package_data: models::PackageData,
        ) -> Result<PackageCreateResponse, ApiError>;

    /// Delete this version of the package.
    async fn package_delete(
        &self,
        id: String,
        x_authorization: Option<String>,
        ) -> Result<PackageDeleteResponse, ApiError>;

    async fn package_rate(
        &self,
        id: String,
        x_authorization: Option<String>,
        ) -> Result<PackageRateResponse, ApiError>;

    /// Interact with the package with this ID
    async fn package_retrieve(
        &self,
        id: String,
        x_authorization: Option<String>,
        ) -> Result<PackageRetrieveResponse, ApiError>;

    /// Update this content of the package.
    async fn package_update(
        &self,
        id: String,
        package: models::Package,
        x_authorization: Option<String>,
        ) -> Result<PackageUpdateResponse, ApiError>;

    /// Get the packages from the registry.
    async fn packages_list(
        &self,
        package_query: &Vec<models::PackageQuery>,
        x_authorization: Option<String>,
        offset: Option<String>,
        ) -> Result<PackagesListResponse, ApiError>;

    /// Reset the registry
    async fn registry_reset(
        &self,
        x_authorization: Option<String>,
        ) -> Result<RegistryResetResponse, ApiError>;

}

/// Trait to extend an API to make it easy to bind it to a context.
pub trait ContextWrapperExt<C: Send + Sync> where Self: Sized
{
    /// Binds this API to a context.
    fn with_context(self, context: C) -> ContextWrapper<Self, C>;
}

impl<T: Api<C> + Send + Sync, C: Clone + Send + Sync> ContextWrapperExt<C> for T {
    fn with_context(self: T, context: C) -> ContextWrapper<T, C> {
         ContextWrapper::<T, C>::new(self, context)
    }
}

#[async_trait]
impl<T: Api<C> + Send + Sync, C: Clone + Send + Sync> ApiNoContext<C> for ContextWrapper<T, C> {
    fn poll_ready(&self, cx: &mut Context) -> Poll<Result<(), ServiceError>> {
        self.api().poll_ready(cx)
    }

    fn context(&self) -> &C {
        ContextWrapper::context(self)
    }

    async fn create_auth_token(
        &self,
        authentication_request: models::AuthenticationRequest,
        ) -> Result<CreateAuthTokenResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().create_auth_token(authentication_request, &context).await
    }

    /// Delete all versions of this package.
    async fn package_by_name_delete(
        &self,
        name: String,
        x_authorization: Option<String>,
        ) -> Result<PackageByNameDeleteResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_by_name_delete(name, x_authorization, &context).await
    }

    async fn package_by_name_get(
        &self,
        name: String,
        x_authorization: Option<String>,
        ) -> Result<PackageByNameGetResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_by_name_get(name, x_authorization, &context).await
    }

    /// Get any packages fitting the regular expression.
    async fn package_by_reg_ex_get(
        &self,
        regex: String,
        body: models::PackageRegEx,
        x_authorization: Option<String>,
        ) -> Result<PackageByRegExGetResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_by_reg_ex_get(regex, body, x_authorization, &context).await
    }

    async fn package_create(
        &self,
        x_authorization: String,
        package_data: models::PackageData,
        ) -> Result<PackageCreateResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_create(x_authorization, package_data, &context).await
    }

    /// Delete this version of the package.
    async fn package_delete(
        &self,
        id: String,
        x_authorization: Option<String>,
        ) -> Result<PackageDeleteResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_delete(id, x_authorization, &context).await
    }

    async fn package_rate(
        &self,
        id: String,
        x_authorization: Option<String>,
        ) -> Result<PackageRateResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_rate(id, x_authorization, &context).await
    }

    /// Interact with the package with this ID
    async fn package_retrieve(
        &self,
        id: String,
        x_authorization: Option<String>,
        ) -> Result<PackageRetrieveResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_retrieve(id, x_authorization, &context).await
    }

    /// Update this content of the package.
    async fn package_update(
        &self,
        id: String,
        package: models::Package,
        x_authorization: Option<String>,
        ) -> Result<PackageUpdateResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().package_update(id, package, x_authorization, &context).await
    }

    /// Get the packages from the registry.
    async fn packages_list(
        &self,
        package_query: &Vec<models::PackageQuery>,
        x_authorization: Option<String>,
        offset: Option<String>,
        ) -> Result<PackagesListResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().packages_list(package_query, x_authorization, offset, &context).await
    }

    /// Reset the registry
    async fn registry_reset(
        &self,
        x_authorization: Option<String>,
        ) -> Result<RegistryResetResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().registry_reset(x_authorization, &context).await
    }

}


#[cfg(feature = "client")]
pub mod client;

// Re-export Client as a top-level name
#[cfg(feature = "client")]
pub use client::Client;

#[cfg(feature = "server")]
pub mod server;

// Re-export router() as a top-level name
#[cfg(feature = "server")]
pub use self::server::Service;

#[cfg(feature = "server")]
pub mod context;

pub mod models;

#[cfg(any(feature = "client", feature = "server"))]
pub(crate) mod header;
