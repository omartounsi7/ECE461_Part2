# coding: utf-8

import pytest
import json
from aiohttp import web

from openapi_server.models.authentication_request import AuthenticationRequest
from openapi_server.models.error import Error
from openapi_server.models.package import Package
from openapi_server.models.package_data import PackageData
from openapi_server.models.package_history_entry import PackageHistoryEntry
from openapi_server.models.package_metadata import PackageMetadata
from openapi_server.models.package_query import PackageQuery
from openapi_server.models.package_rating import PackageRating


async def test_create_auth_token(client):
    """Test case for create_auth_token

    
    """
    body = {"Secret":{"password":"password"},"User":{"name":"Alfalfa","isAdmin":True}}
    headers = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
    response = await client.request(
        method='PUT',
        path='/authenticate',
        headers=headers,
        json=body,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_by_name_delete(client):
    """Test case for package_by_name_delete

    Delete all versions of this package.
    """
    headers = { 
        'x_authorization': 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }
    response = await client.request(
        method='DELETE',
        path='/package/byName/{name}'.format(name='name_example'),
        headers=headers,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_by_name_get(client):
    """Test case for package_by_name_get

    
    """
    headers = { 
        'Accept': 'application/json',
        'x_authorization': 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }
    response = await client.request(
        method='GET',
        path='/package/byName/{name}'.format(name='Underscore'),
        headers=headers,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_by_reg_ex_get(client):
    """Test case for package_by_reg_ex_get

    Get any packages fitting the regular expression.
    """
    body = 'body_example'
    headers = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x_authorization': 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }
    response = await client.request(
        method='POST',
        path='/package/byRegEx/{regex}'.format(regex='.*Underscore.*'),
        headers=headers,
        json=body,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_create(client):
    """Test case for package_create

    
    """
    body = {"Content":"Content","JSProgram":"JSProgram","URL":"URL"}
    headers = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x_authorization': 'x_authorization_example',
    }
    response = await client.request(
        method='POST',
        path='/package',
        headers=headers,
        json=body,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_delete(client):
    """Test case for package_delete

    Delete this version of the package.
    """
    headers = { 
        'x_authorization': 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }
    response = await client.request(
        method='DELETE',
        path='/package/{id}'.format(id='id_example'),
        headers=headers,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_rate(client):
    """Test case for package_rate

    
    """
    headers = { 
        'Accept': 'application/json',
        'x_authorization': 'x_authorization_example',
    }
    response = await client.request(
        method='GET',
        path='/package/{id}/rate'.format(id='id_example'),
        headers=headers,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_retrieve(client):
    """Test case for package_retrieve

    Interact with the package with this ID
    """
    headers = { 
        'Accept': 'application/json',
        'x_authorization': 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }
    response = await client.request(
        method='GET',
        path='/package/{id}'.format(id='id_example'),
        headers=headers,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_package_update(client):
    """Test case for package_update

    Update this content of the package.
    """
    body = {"metadata":{"Version":"1.2.3","ID":"ID","Name":"Name"},"data":{"Content":"Content","JSProgram":"JSProgram","URL":"URL"}}
    headers = { 
        'Content-Type': 'application/json',
        'x_authorization': 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }
    response = await client.request(
        method='PUT',
        path='/package/{id}'.format(id='id_example'),
        headers=headers,
        json=body,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_packages_list(client):
    """Test case for packages_list

    Get the packages from the registry.
    """
    body = {"Version":"Exact (1.2.3)\nBounded range (1.2.3-2.1.0)\nCarat (^1.2.3)\nTilde (~1.2.0)","Name":"Name"}
    params = [('offset', 'offset_example')]
    headers = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x_authorization': 'x_authorization_example',
    }
    response = await client.request(
        method='POST',
        path='/packages',
        headers=headers,
        json=body,
        params=params,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')


async def test_registry_reset(client):
    """Test case for registry_reset

    Reset the registry
    """
    headers = { 
        'x_authorization': 'x_authorization_example',
    }
    response = await client.request(
        method='DELETE',
        path='/reset',
        headers=headers,
        )
    assert response.status == 200, 'Response body is : ' + (await response.read()).decode('utf-8')

