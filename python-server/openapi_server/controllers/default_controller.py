from typing import List, Dict
from aiohttp import web

from openapi_server.models.authentication_request import AuthenticationRequest
from openapi_server.models.error import Error
from openapi_server.models.package import Package
from openapi_server.models.package_data import PackageData
from openapi_server.models.package_history_entry import PackageHistoryEntry
from openapi_server.models.package_metadata import PackageMetadata
from openapi_server.models.package_query import PackageQuery
from openapi_server.models.package_rating import PackageRating
from openapi_server import util


async def create_auth_token(request: web.Request, body) -> web.Response:
    """create_auth_token

    Create an access token.

    :param body: 
    :type body: dict | bytes

    """
    body = AuthenticationRequest.from_dict(body)
    return web.Response(status=200)


async def package_by_name_delete(request: web.Request, name, x_authorization=None) -> web.Response:
    """Delete all versions of this package.

    

    :param name: 
    :type name: str
    :param x_authorization: 
    :type x_authorization: str

    """
    return web.Response(status=200)


async def package_by_name_get(request: web.Request, name, x_authorization=None) -> web.Response:
    """package_by_name_get

    Return the history of this package (all versions).

    :param name: 
    :type name: str
    :param x_authorization: 
    :type x_authorization: str

    """
    return web.Response(status=200)


async def package_by_reg_ex_get(request: web.Request, regex, body, x_authorization=None) -> web.Response:
    """Get any packages fitting the regular expression.

    Search for a package using regular expression over package names and READMEs. This is similar to search by name.

    :param regex: 
    :type regex: str
    :param body: 
    :type body: str
    :param x_authorization: 
    :type x_authorization: str

    """
    return web.Response(status=200)


async def package_create(request: web.Request, x_authorization, body) -> web.Response:
    """package_create

    

    :param x_authorization: 
    :type x_authorization: str
    :param body: 
    :type body: dict | bytes

    """
    body = PackageData.from_dict(body)
    return web.Response(status=200)


async def package_delete(request: web.Request, id, x_authorization=None) -> web.Response:
    """Delete this version of the package.

    

    :param id: Package ID
    :type id: str
    :param x_authorization: 
    :type x_authorization: str

    """
    return web.Response(status=200)


async def package_rate(request: web.Request, id, x_authorization=None) -> web.Response:
    """package_rate

    

    :param id: 
    :type id: str
    :param x_authorization: 
    :type x_authorization: str

    """
    return web.Response(status=200)


async def package_retrieve(request: web.Request, id, x_authorization=None) -> web.Response:
    """Interact with the package with this ID

    Return this package.

    :param id: ID of package to fetch
    :type id: str
    :param x_authorization: 
    :type x_authorization: str

    """
    return web.Response(status=200)


async def package_update(request: web.Request, id, body, x_authorization=None) -> web.Response:
    """Update this content of the package.

    The name, version, and ID must match.  The package contents (from PackageData) will replace the previous contents.

    :param id: 
    :type id: str
    :param body: 
    :type body: dict | bytes
    :param x_authorization: 
    :type x_authorization: str

    """
    body = Package.from_dict(body)
    return web.Response(status=200)


async def packages_list(request: web.Request, body, x_authorization=None, offset=None) -> web.Response:
    """Get the packages from the registry.

    Get any packages fitting the query. Search for packages satisfying the indicated query.  If you want to enumerate all packages, provide an array with a single PackageQuery whose name is \&quot;*\&quot;.  The response is paginated; the response header includes the offset to use in the next query.

    :param body: 
    :type body: list | bytes
    :param x_authorization: 
    :type x_authorization: str
    :param offset: Provide this for pagination. If not provided, returns the first page of results.
    :type offset: str

    """
    body = [PackageQuery.from_dict(d) for d in body]
    return web.Response(status=200)


async def registry_reset(request: web.Request, x_authorization=None) -> web.Response:
    """Reset the registry

    Reset the registry to a system default state.

    :param x_authorization: 
    :type x_authorization: str

    """
    return web.Response(status=200)
