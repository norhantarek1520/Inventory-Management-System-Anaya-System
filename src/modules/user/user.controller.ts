import { Controller, Get, Post, Body, Param, Patch, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, GetUserQueryDto, UpdateUserDto } from 'src/commons/dtos';
import { ParseObjectIdPipe } from 'node_modules/@nestjs/mongoose/dist';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Registers a new user, generates a unique user code, and returns the created user without sensitive fields.',
  })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Validation error in request body.' })
  @ApiResponse({ status: 409, description: 'Username, email, or phone number already in use.' })
  createUser(@Body() user: CreateUserDto) {
    console.log('✨Received request to create user');
    return this.userService.createUser(user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all users',
    description: 'Fetches paginated list of users with multi-field search and dynamic filtering capabilities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of users and pagination metrics.',
  })
  getAllUsers(@Query() getUserQueryDto?: GetUserQueryDto) {
    console.log('✨Fetching all users from controller...');
    return this.userService.getAllUsers(getUserQueryDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a single user record by its MongoDB ObjectId, excluding sensitive security credentials.',
  })
  @ApiParam({
    name: 'id',
    description: 'Target user MongoDB ObjectId',
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
  })
  @ApiResponse({ status: 200, description: 'User record successfully found.' })
  @ApiResponse({ status: 400, description: 'Invalid Mongo ID format provided.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getUserById(@Param('id', ParseObjectIdPipe) id: string) {
    console.log('✨Fetching one user from controller...');
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user by ID',
    description: 'Partially updates specific fields on an existing user account while ensuring unique constraints.',
  })
  @ApiParam({
    name: 'id',
    description: 'Target user MongoDB ObjectId',
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid Mongo ID format or invalid body properties.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({
    status: 409,
    description: 'Updated email or phone is already taken by another user.',
  })
  updateUser(@Param('id', ParseObjectIdPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    console.log('Update one user from controller...');

    return this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user by ID',
    description: 'Removes a user record permanently from the database by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Target user MongoDB ObjectId',
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
  })
  @ApiResponse({ status: 204, description: 'User deleted successfully with no response body.' })
  @ApiResponse({ status: 400, description: 'Invalid Mongo ID format provided.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  deleteUser(@Param('id', ParseObjectIdPipe) id: string) {
    console.log('Delete one user from controller...');

    return this.userService.deleteUser(id);
  }

  @Delete('/reset/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reset user database',
    description: 'Deletes all user records from the collection.',
  })
  @ApiResponse({ status: 204, description: 'Database cleared successfully.' })
  resetAllUser() {
    console.log('Reset all users from controller...');

    return this.userService.resetAllUser();
  }
}
